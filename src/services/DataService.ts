import { getSupabaseClient } from '@/db/supabase';
import cacheService, { STORES } from './CacheService';
import type {
  PlannerEvent,
  EventRundownItem,
  EventCrewMember,
  EventBudgetItem,
  EventLogisticsItem,
  EventVendor,
  EventMilestone,
} from '@/types/event';

class DataService {
  private supabase = getSupabaseClient();
  private cacheEnabled = true;

  /**
   * Generic error handler
   */
  private handleError(error: any, context: string): never {
    console.error(`Error in ${context}:`, error);
    throw new Error(`${context}: ${error.message || 'Unknown error'}`);
  }

  /**
   * Background sync helper
   */
  private async syncInBackground(storeName: string, fetchFn: () => Promise<any[]>): Promise<void> {
    setTimeout(async () => {
      try {
        const freshData = await fetchFn();
        if (freshData) {
          await cacheService.putAll(storeName, freshData);
          console.log(`[Cache] Background sync complete for ${storeName}`);
        }
      } catch (e) {
        console.warn('[Cache] Background sync failed:', e);
      }
    }, 100);
  }

  private daysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  private groupSessionsByDate(sessions: any[]): Record<string, number> {
    return sessions.reduce((acc: Record<string, number>, session) => {
      acc[session.date] = (acc[session.date] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Direct database operations (used by cache sync)
   */
  public async createDirect(table: string, data: any): Promise<any> {
    const { data: result, error } = await this.supabase
      .from(table)
      .insert([data])
      .select();
    if (error) throw error;
    return result[0];
  }

  public async updateDirect(table: string, id: string, data: any): Promise<any> {
    const { data: result, error } = await this.supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
    if (error) throw error;
    return result[0];
  }

  public async deleteDirect(table: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ==================== ANNUAL GOALS ====================

  public async getAnnualGoals(year: number): Promise<any[]> {
    const fetchFn = async () => {
      const { data, error } = await this.supabase
        .from('annual_goals')
        .select('*')
        .eq('year', year)
        .order('created_at');
      if (error) throw error;
      return data || [];
    };

    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.goals);
        const yearData = cached.filter((g) => g.year === year);
        if (yearData.length > 0) {
          if (cacheService.online) {
            this.syncInBackground(STORES.goals, async () => {
              const { data } = await this.supabase.from('annual_goals').select('*');
              return data || [];
            });
          }
          return yearData;
        }
      }

      const data = await fetchFn();
      if (this.cacheEnabled && data) {
        await cacheService.putAll(STORES.goals, data);
      }
      return data;
    } catch (error) {
      this.handleError(error, 'getAnnualGoals');
    }
  }

  public async createAnnualGoal(goal: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const goalWithUser = { ...goal, user_id: user.id };

      if (!cacheService.online) {
        const tempGoal = {
          ...goalWithUser,
          id: `temp_${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        await cacheService.put(STORES.goals, tempGoal);
        await cacheService.addPendingSync({
          type: 'create',
          store: 'annual_goals',
          data: goalWithUser,
        });
        return tempGoal;
      }

      const { data, error } = await this.supabase
        .from('annual_goals')
        .insert([goalWithUser])
        .select();

      if (error) throw error;

      if (this.cacheEnabled && data[0]) {
        await cacheService.put(STORES.goals, data[0]);
      }

      return data[0];
    } catch (error) {
      this.handleError(error, 'createAnnualGoal');
    }
  }

  public async updateAnnualGoal(id: string, updates: any): Promise<any> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.get(STORES.goals, id);
        if (cached) {
          await cacheService.put(STORES.goals, { ...cached, ...updates });
        }
      }

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'update',
          store: 'annual_goals',
          itemId: id,
          data: updates,
        });
        return await cacheService.get(STORES.goals, id);
      }

      const { data, error } = await this.supabase
        .from('annual_goals')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateAnnualGoal');
    }
  }

  public async deleteAnnualGoal(id: string): Promise<void> {
    try {
      if (this.cacheEnabled) {
        await cacheService.delete(STORES.goals, id);
      }

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'delete',
          store: 'annual_goals',
          itemId: id,
        });
        return;
      }

      const { error } = await this.supabase
        .from('annual_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteAnnualGoal');
    }
  }

  // ==================== WEEKLY GOALS ====================

  public async getWeeklyGoals(year: number, weekNumber: number): Promise<any[]> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.weeklyGoals);
        const weekData = cached.filter((g) => g.year === year && g.week_number === weekNumber);
        if (weekData.length > 0) {
          if (cacheService.online) {
            this.syncInBackground(STORES.weeklyGoals, async () => {
              const { data } = await this.supabase.from('weekly_goals').select('*');
              return data || [];
            });
          }
          return weekData;
        }
      }

      const { data, error } = await this.supabase
        .from('weekly_goals')
        .select('*')
        .eq('year', year)
        .eq('week_number', weekNumber)
        .order('created_at');

      if (error) throw error;
      if (this.cacheEnabled && data) await cacheService.putAll(STORES.weeklyGoals, data);
      return data || [];
    } catch (error) {
      this.handleError(error, 'getWeeklyGoals');
    }
  }

  public async createWeeklyGoal(goal: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const goalWithUser = { ...goal, user_id: user.id };

      if (!cacheService.online) {
        const tempGoal = {
          ...goalWithUser,
          id: `temp_${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        await cacheService.put(STORES.weeklyGoals, tempGoal);
        await cacheService.addPendingSync({
          type: 'create',
          store: 'weekly_goals',
          data: goalWithUser,
        });
        return tempGoal;
      }

      const { data, error } = await this.supabase
        .from('weekly_goals')
        .insert([goalWithUser])
        .select();

      if (error) throw error;
      if (this.cacheEnabled && data[0]) await cacheService.put(STORES.weeklyGoals, data[0]);
      return data[0];
    } catch (error) {
      this.handleError(error, 'createWeeklyGoal');
    }
  }

  public async updateWeeklyGoal(id: string, updates: any): Promise<any> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.get(STORES.weeklyGoals, id);
        if (cached) await cacheService.put(STORES.weeklyGoals, { ...cached, ...updates });
      }

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'update',
          store: 'weekly_goals',
          itemId: id,
          data: updates,
        });
        return await cacheService.get(STORES.weeklyGoals, id);
      }

      const { data, error } = await this.supabase
        .from('weekly_goals')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateWeeklyGoal');
    }
  }

  public async deleteWeeklyGoal(id: string): Promise<void> {
    try {
      if (this.cacheEnabled) await cacheService.delete(STORES.weeklyGoals, id);

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'delete',
          store: 'weekly_goals',
          itemId: id,
        });
        return;
      }

      const { error } = await this.supabase
        .from('weekly_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteWeeklyGoal');
    }
  }

  // ==================== TIME BLOCKS ====================

  public async getTimeBlocks(date: string): Promise<any[]> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.timeBlocks);
        const dateBlocks = cached.filter((b) => b.date === date);
        if (dateBlocks.length > 0) {
          if (cacheService.online) {
            this.syncInBackground(STORES.timeBlocks, async () => {
              const { data } = await this.supabase.from('time_blocks').select('*').eq('date', date);
              return data || [];
            });
          }
          return dateBlocks.sort((a, b) => a.start_time.localeCompare(b.start_time));
        }
      }

      const { data, error } = await this.supabase
        .from('time_blocks')
        .select('*')
        .eq('date', date)
        .order('start_time');

      if (error) throw error;
      if (this.cacheEnabled && data) await cacheService.putAll(STORES.timeBlocks, data);
      return data || [];
    } catch (error) {
      this.handleError(error, 'getTimeBlocks');
    }
  }

  public async getTimeBlocksRange(startDate: string, endDate: string): Promise<any[]> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.timeBlocks);
        const rangeBlocks = cached.filter((b) => b.date >= startDate && b.date <= endDate);
        if (rangeBlocks.length > 0) {
          if (cacheService.online) {
            this.syncInBackground(STORES.timeBlocks, async () => {
              const { data } = await this.supabase
                .from('time_blocks')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate);
              return data || [];
            });
          }
          return rangeBlocks.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
        }
      }

      const { data, error } = await this.supabase
        .from('time_blocks')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
        .order('start_time');

      if (error) throw error;
      if (this.cacheEnabled && data) await cacheService.putAll(STORES.timeBlocks, data);
      return data || [];
    } catch (error) {
      this.handleError(error, 'getTimeBlocksRange');
    }
  }

  public async createTimeBlock(timeBlock: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const blockWithUser = { ...timeBlock, user_id: user.id };

      if (!cacheService.online) {
        const tempBlock = {
          ...blockWithUser,
          id: `temp_${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        await cacheService.put(STORES.timeBlocks, tempBlock);
        await cacheService.addPendingSync({
          type: 'create',
          store: 'time_blocks',
          data: blockWithUser,
        });
        return tempBlock;
      }

      const { data, error } = await this.supabase
        .from('time_blocks')
        .insert([blockWithUser])
        .select();

      if (error) throw error;
      if (this.cacheEnabled && data[0]) await cacheService.put(STORES.timeBlocks, data[0]);
      return data[0];
    } catch (error) {
      this.handleError(error, 'createTimeBlock');
    }
  }

  public async updateTimeBlock(id: string, updates: any): Promise<any> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.get(STORES.timeBlocks, id);
        if (cached) await cacheService.put(STORES.timeBlocks, { ...cached, ...updates });
      }

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'update',
          store: 'time_blocks',
          itemId: id,
          data: updates,
        });
        return await cacheService.get(STORES.timeBlocks, id);
      }

      const { data, error } = await this.supabase
        .from('time_blocks')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateTimeBlock');
    }
  }

  public async deleteTimeBlock(id: string): Promise<void> {
    try {
      if (this.cacheEnabled) await cacheService.delete(STORES.timeBlocks, id);

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'delete',
          store: 'time_blocks',
          itemId: id,
        });
        return;
      }

      const { error } = await this.supabase
        .from('time_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteTimeBlock');
    }
  }

  // ==================== READING LIST ====================

  public async getReadingList(year: number): Promise<any[]> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.readingList);
        const yearData = cached.filter((b) => b.year === year);
        if (yearData.length > 0) {
          if (cacheService.online) {
            this.syncInBackground(STORES.readingList, async () => {
              const { data } = await this.supabase.from('reading_list').select('*');
              return data || [];
            });
          }
          return yearData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        }
      }

      const { data, error } = await this.supabase
        .from('reading_list')
        .select('*')
        .eq('year', year)
        .order('order_index');

      if (error) throw error;
      if (this.cacheEnabled && data) await cacheService.putAll(STORES.readingList, data);
      return data || [];
    } catch (error) {
      this.handleError(error, 'getReadingList');
    }
  }

  public async createReadingListEntry(book: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const bookWithUser = { ...book, user_id: user.id };

      if (!cacheService.online) {
        const tempBook = {
          ...bookWithUser,
          id: `temp_${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        await cacheService.put(STORES.readingList, tempBook);
        await cacheService.addPendingSync({
          type: 'create',
          store: 'reading_list',
          data: bookWithUser,
        });
        return tempBook;
      }

      const { data, error } = await this.supabase
        .from('reading_list')
        .insert([bookWithUser])
        .select();

      if (error) throw error;
      if (this.cacheEnabled && data[0]) await cacheService.put(STORES.readingList, data[0]);
      return data[0];
    } catch (error) {
      this.handleError(error, 'createReadingListEntry');
    }
  }

  public async updateReadingListEntry(id: string, updates: any): Promise<any> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.get(STORES.readingList, id);
        if (cached) await cacheService.put(STORES.readingList, { ...cached, ...updates });
      }

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'update',
          store: 'reading_list',
          itemId: id,
          data: updates,
        });
        return await cacheService.get(STORES.readingList, id);
      }

      const { data, error } = await this.supabase
        .from('reading_list')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateReadingListEntry');
    }
  }

  public async deleteReadingListEntry(id: string): Promise<void> {
    try {
      if (this.cacheEnabled) await cacheService.delete(STORES.readingList, id);

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'delete',
          store: 'reading_list',
          itemId: id,
        });
        return;
      }

      const { error } = await this.supabase
        .from('reading_list')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteReadingListEntry');
    }
  }

  // ==================== DAILY HABITS ====================

  public async getDailyHabits(): Promise<any[]> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.habits);
        if (cached && cached.length > 0) {
          if (cacheService.online) {
            this.syncInBackground(STORES.habits, async () => {
              const { data } = await this.supabase.from('daily_habits').select('*').order('order_index');
              return data || [];
            });
          }
          return cached.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        }
      }

      const { data, error } = await this.supabase
        .from('daily_habits')
        .select('*')
        .order('order_index');

      if (error) throw error;
      if (this.cacheEnabled && data) await cacheService.putAll(STORES.habits, data);
      return data || [];
    } catch (error) {
      this.handleError(error, 'getDailyHabits');
    }
  }

  public async createDailyHabit(habit: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const habitWithUser = { ...habit, user_id: user.id };

      if (!cacheService.online) {
        const tempHabit = {
          ...habitWithUser,
          id: `temp_${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        await cacheService.put(STORES.habits, tempHabit);
        await cacheService.addPendingSync({
          type: 'create',
          store: 'daily_habits',
          data: habitWithUser,
        });
        return tempHabit;
      }

      const { data, error } = await this.supabase
        .from('daily_habits')
        .insert([habitWithUser])
        .select();

      if (error) throw error;
      if (this.cacheEnabled && data[0]) await cacheService.put(STORES.habits, data[0]);
      return data[0];
    } catch (error) {
      this.handleError(error, 'createDailyHabit');
    }
  }

  public async updateDailyHabit(id: string, updates: any): Promise<any> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.get(STORES.habits, id);
        if (cached) await cacheService.put(STORES.habits, { ...cached, ...updates });
      }

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'update',
          store: 'daily_habits',
          itemId: id,
          data: updates,
        });
        return await cacheService.get(STORES.habits, id);
      }

      const { data, error } = await this.supabase
        .from('daily_habits')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateDailyHabit');
    }
  }

  public async deleteDailyHabit(id: string): Promise<void> {
    try {
      if (this.cacheEnabled) await cacheService.delete(STORES.habits, id);

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'delete',
          store: 'daily_habits',
          itemId: id,
        });
        return;
      }

      const { error } = await this.supabase
        .from('daily_habits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteDailyHabit');
    }
  }

  // ==================== DAILY HABIT COMPLETIONS ====================

  public async getDailyHabitCompletions(startDate: string, endDate: string): Promise<any[]> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.habitLogs);
        const filtered = cached.filter((log) => log.date >= startDate && log.date <= endDate);
        if (filtered.length > 0) {
          if (cacheService.online) {
            this.syncInBackground(STORES.habitLogs, async () => {
              const { data } = await this.supabase
                .from('daily_habit_completions')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate);
              return data || [];
            });
          }
          return filtered;
        }
      }

      const { data, error } = await this.supabase
        .from('daily_habit_completions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) throw error;
      if (this.cacheEnabled && data) await cacheService.putAll(STORES.habitLogs, data);
      return data || [];
    } catch (error) {
      this.handleError(error, 'getDailyHabitCompletions');
    }
  }

  public async toggleDailyHabitCompletion(
    habitId: string,
    date: string,
    completed: boolean
  ): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (this.cacheEnabled) {
        const cachedLogs = await cacheService.getAll(STORES.habitLogs);
        const log = cachedLogs.find((l) => l.habit_id === habitId && l.date === date);
        const updatedLog = {
          id: log?.id || `temp_log_${Date.now()}`,
          habit_id: habitId,
          date,
          completed,
          user_id: user.id,
        };
        await cacheService.put(STORES.habitLogs, updatedLog);
      }

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'create',
          store: 'daily_habit_completions',
          data: { habit_id: habitId, date, completed, user_id: user.id },
        });
        return { habit_id: habitId, date, completed };
      }

      const { data, error } = await this.supabase
        .from('daily_habit_completions')
        .upsert([{ habit_id: habitId, date, completed, user_id: user.id }], {
          onConflict: 'habit_id,date',
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'toggleDailyHabitCompletion');
    }
  }

  public async updateHabitNote(habitId: string, date: string, notes: string): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('daily_habit_completions')
        .upsert([{ habit_id: habitId, date, notes, user_id: user.id }], {
          onConflict: 'habit_id,date',
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateHabitNote');
    }
  }

  // ==================== WEEKLY HABITS ====================

  public async getWeeklyHabits(): Promise<any[]> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.weeklyHabits);
        if (cached && cached.length > 0) {
          return cached;
        }
      }
      const { data, error } = await this.supabase.from('weekly_habits').select('*');
      if (error) throw error;
      if (this.cacheEnabled && data) await cacheService.putAll(STORES.weeklyHabits, data);
      return data || [];
    } catch (error) {
      this.handleError(error, 'getWeeklyHabits');
    }
  }

  public async createWeeklyHabit(habit: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('weekly_habits')
        .insert([{ ...habit, user_id: user.id }])
        .select();

      if (error) throw error;
      if (this.cacheEnabled && data[0]) await cacheService.put(STORES.weeklyHabits, data[0]);
      return data[0];
    } catch (error) {
      this.handleError(error, 'createWeeklyHabit');
    }
  }

  public async updateWeeklyHabit(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('weekly_habits')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (this.cacheEnabled && data[0]) await cacheService.put(STORES.weeklyHabits, data[0]);
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateWeeklyHabit');
    }
  }

  public async deleteWeeklyHabit(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('weekly_habits').delete().eq('id', id);
      if (error) throw error;
      if (this.cacheEnabled) await cacheService.delete(STORES.weeklyHabits, id);
    } catch (error) {
      this.handleError(error, 'deleteWeeklyHabit');
    }
  }

  public async getWeeklyHabitCompletions(startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('weekly_habit_completions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getWeeklyHabitCompletions');
    }
  }

  public async toggleWeeklyHabitCompletion(
    habitId: string,
    date: string,
    completed: boolean
  ): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('weekly_habit_completions')
        .upsert([{ habit_id: habitId, date, completed, user_id: user.id }], {
          onConflict: 'habit_id,date',
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'toggleWeeklyHabitCompletion');
    }
  }

  // ==================== MONTHLY DATA ====================

  public async getMonthlyData(year: number, month: number): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('monthly_data')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    } catch (error) {
      this.handleError(error, 'getMonthlyData');
    }
  }

  public async upsertMonthlyData(monthlyData: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const dataWithUser = { ...monthlyData, user_id: user.id };

      const { data, error } = await this.supabase
        .from('monthly_data')
        .upsert([dataWithUser], { onConflict: 'user_id,year,month' })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'upsertMonthlyData');
    }
  }

  // ==================== MOOD, SLEEP, WATER TRACKERS ====================

  public async getMoodEntries(startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('mood_tracker')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getMoodEntries');
    }
  }

  public async setMood(date: string, moodEmoji: string): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('mood_tracker')
        .upsert([{ date, mood_emoji: moodEmoji, user_id: user.id }], { onConflict: 'user_id,date' })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'setMood');
    }
  }

  public async getSleepEntries(startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('sleep_tracker')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getSleepEntries');
    }
  }

  public async setSleepData(
    date: string,
    bedtime: string,
    wakeTime: string,
    hoursSlept: number
  ): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('sleep_tracker')
        .upsert(
          [{ date, bedtime, wake_time: wakeTime, hours_slept: hoursSlept, user_id: user.id }],
          { onConflict: 'user_id,date' }
        )
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'setSleepData');
    }
  }

  public async getWaterEntries(startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('water_tracker')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getWaterEntries');
    }
  }

  public async setWaterIntake(date: string, glassesConsumed: number, goalGlasses = 8): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('water_tracker')
        .upsert(
          [{ date, glasses_consumed: glassesConsumed, goal_glasses: goalGlasses, user_id: user.id }],
          { onConflict: 'user_id,date' }
        )
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'setWaterIntake');
    }
  }

  // ==================== POMODORO SESSIONS ====================

  public async getPomodoroSessions(date: string): Promise<any[]> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.pomodoroSessions);
        const dateSessions = cached.filter((session) => session.date === date);
        if (dateSessions.length > 0) {
          if (cacheService.online) {
            this.syncInBackground(STORES.pomodoroSessions, async () => {
              const { data } = await this.supabase
                .from('pomodoro_sessions')
                .select('*')
                .eq('date', date)
                .order('started_at', { ascending: true });
              return data || [];
            });
          }
          return dateSessions.sort((a, b) => a.started_at.localeCompare(b.started_at));
        }
      }

      const { data, error } = await this.supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('date', date)
        .order('started_at', { ascending: true });

      if (error) throw error;
      if (this.cacheEnabled && data) await cacheService.putAll(STORES.pomodoroSessions, data);
      return data || [];
    } catch (error) {
      this.handleError(error, 'getPomodoroSessions');
    }
  }

  public async getPomodoroSessionsRange(startDate: string, endDate: string): Promise<any[]> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.getAll(STORES.pomodoroSessions);
        const rangeSessions = cached.filter(
          (session) => session.date >= startDate && session.date <= endDate
        );
        if (rangeSessions.length > 0) {
          if (cacheService.online) {
            this.syncInBackground(STORES.pomodoroSessions, async () => {
              const { data } = await this.supabase
                .from('pomodoro_sessions')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('started_at', { ascending: true });
              return data || [];
            });
          }
          return rangeSessions.sort((a, b) => a.started_at.localeCompare(b.started_at));
        }
      }

      const { data, error } = await this.supabase
        .from('pomodoro_sessions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('started_at', { ascending: true });

      if (error) throw error;
      if (this.cacheEnabled && data) await cacheService.putAll(STORES.pomodoroSessions, data);
      return data || [];
    } catch (error) {
      this.handleError(error, 'getPomodoroSessionsRange');
    }
  }

  public async getPomodoroStats(startDate: string, endDate: string): Promise<any> {
    try {
      const sessions = await this.getPomodoroSessionsRange(startDate, endDate);
      const focusSessions = sessions.filter(
        (session) => session.session_type === 'focus' && session.was_completed
      );

      return {
        totalSessions: focusSessions.length,
        totalMinutes: focusSessions.reduce(
          (sum, session) => sum + (session.duration_minutes || 0),
          0
        ),
        averagePerDay:
          focusSessions.length / Math.max(1, this.daysBetween(startDate, endDate)),
        sessionsPerDay: this.groupSessionsByDate(focusSessions),
      };
    } catch (error) {
      this.handleError(error, 'getPomodoroStats');
    }
  }

  public async createPomodoroSession(session: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const sessionWithUser = { ...session, user_id: user.id };

      if (!cacheService.online) {
        const tempSession = {
          ...sessionWithUser,
          id: `temp_pomodoro_${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        await cacheService.put(STORES.pomodoroSessions, tempSession);
        await cacheService.addPendingSync({
          type: 'create',
          store: 'pomodoro_sessions',
          data: sessionWithUser,
        });
        return tempSession;
      }

      const { data, error } = await this.supabase
        .from('pomodoro_sessions')
        .insert([sessionWithUser])
        .select();

      if (error) throw error;
      if (this.cacheEnabled && data[0]) await cacheService.put(STORES.pomodoroSessions, data[0]);
      return data[0];
    } catch (error) {
      this.handleError(error, 'createPomodoroSession');
    }
  }

  public async updatePomodoroSession(id: string, updates: any): Promise<any> {
    try {
      if (this.cacheEnabled) {
        const cached = await cacheService.get(STORES.pomodoroSessions, id);
        if (cached) await cacheService.put(STORES.pomodoroSessions, { ...cached, ...updates });
      }

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'update',
          store: 'pomodoro_sessions',
          itemId: id,
          data: updates,
        });
        return await cacheService.get(STORES.pomodoroSessions, id);
      }

      const { data, error } = await this.supabase
        .from('pomodoro_sessions')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updatePomodoroSession');
    }
  }

  public async deletePomodoroSession(id: string): Promise<void> {
    try {
      if (this.cacheEnabled) await cacheService.delete(STORES.pomodoroSessions, id);

      if (!cacheService.online) {
        await cacheService.addPendingSync({
          type: 'delete',
          store: 'pomodoro_sessions',
          itemId: id,
        });
        return;
      }

      const { error } = await this.supabase
        .from('pomodoro_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deletePomodoroSession');
    }
  }

  // ==================== ACTION PLANS ====================

  public async getActionPlans(year: number, month: number): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('action_plans')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .order('created_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getActionPlans');
    }
  }

  public async createActionPlan(plan: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('action_plans')
        .insert([{ ...plan, user_id: user.id }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createActionPlan');
    }
  }

  public async updateActionPlan(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('action_plans')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateActionPlan');
    }
  }

  public async deleteActionPlan(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('action_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteActionPlan');
    }
  }

  // ==================== CUSTOM CATEGORIES ====================

  public async getCustomCategories(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('custom_categories')
        .select('*')
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getCustomCategories');
    }
  }

  public async createCustomCategory(category: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('custom_categories')
        .insert([{ ...category, user_id: user.id }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createCustomCategory');
    }
  }

  // ==================== CALENDAR EVENTS ====================

  public async getCalendarEventsRange(startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('calendar_events')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getCalendarEventsRange');
    }
  }

  public async createCalendarEvent(event: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('calendar_events')
        .insert([{ ...event, user_id: user.id }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createCalendarEvent');
    }
  }

  public async deleteCalendarEvent(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteCalendarEvent');
    }
  }

  public async updateCalendarEvent(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase.from('calendar_events').update(updates).eq('id', id).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateCalendarEvent');
    }
  }

  // ==================== CANVAS DOCUMENTS ====================

  public async getCanvasDocuments(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('canvas_documents')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getCanvasDocuments');
    }
  }

  public async createCanvasDocument(document: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('canvas_documents')
        .insert([{ ...document, user_id: user.id }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createCanvasDocument');
    }
  }

  public async updateCanvasDocument(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('canvas_documents')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateCanvasDocument');
    }
  }

  public async deleteCanvasDocument(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('canvas_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteCanvasDocument');
    }
  }

  // ==================== KANBAN ====================

  public async getKanbanBoards(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('kanban_boards')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getKanbanBoards');
    }
  }

  public async createKanbanBoard(board: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('kanban_boards')
        .insert([{ ...board, user_id: user.id }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createKanbanBoard');
    }
  }

  public async updateKanbanBoard(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('kanban_boards')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateKanbanBoard');
    }
  }

  public async deleteKanbanBoard(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('kanban_boards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteKanbanBoard');
    }
  }

  public async getKanbanColumns(boardId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('kanban_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getKanbanColumns');
    }
  }

  public async createKanbanColumn(column: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('kanban_columns')
        .insert([column])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createKanbanColumn');
    }
  }

  public async getKanbanCards(boardId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('kanban_cards')
        .select('*')
        .eq('board_id', boardId)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getKanbanCards');
    }
  }

  public async createKanbanCard(card: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('kanban_cards')
        .insert([card])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createKanbanCard');
    }
  }

  public async updateKanbanCard(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('kanban_cards')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateKanbanCard');
    }
  }

  public async deleteKanbanCard(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('kanban_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteKanbanCard');
    }
  }

  public async updateKanbanColumn(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase.from('kanban_columns').update(updates).eq('id', id).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateKanbanColumn');
    }
  }

  public async deleteKanbanColumn(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('kanban_columns').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteKanbanColumn');
    }
  }

  public async getKanbanChecklistItems(cardId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.from('kanban_checklist_items').select('*').eq('card_id', cardId).order('order_index');
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getKanbanChecklistItems');
    }
  }

  public async createKanbanChecklistItem(item: any): Promise<any> {
    try {
      const { data, error } = await this.supabase.from('kanban_checklist_items').insert([item]).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createKanbanChecklistItem');
    }
  }

  public async updateKanbanChecklistItem(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase.from('kanban_checklist_items').update(updates).eq('id', id).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateKanbanChecklistItem');
    }
  }

  public async deleteKanbanChecklistItem(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('kanban_checklist_items').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteKanbanChecklistItem');
    }
  }

  public async getKanbanComments(cardId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.from('kanban_comments').select('*').eq('card_id', cardId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getKanbanComments');
    }
  }

  public async createKanbanComment(comment: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await this.supabase.from('kanban_comments').insert([{ ...comment, user_id: user.id }]).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createKanbanComment');
    }
  }

  public async deleteKanbanComment(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('kanban_comments').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteKanbanComment');
    }
  }

  public async getKanbanActivity(cardId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.from('kanban_activity_log').select('*').eq('card_id', cardId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getKanbanActivity');
    }
  }

  public async createKanbanActivity(entry: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await this.supabase.from('kanban_activity_log').insert([{ ...entry, user_id: user.id }]).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createKanbanActivity');
    }
  }

  // ==================== INTERVAL CHALLENGES ====================

  public async getIntervalChallenges(includeArchived = false): Promise<any[]> {
    try {
      let query = this.supabase.from('interval_challenges').select('*').order('start_date', { ascending: false });
      if (!includeArchived) query = query.eq('is_archived', false);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getIntervalChallenges');
    }
  }

  public async createIntervalChallenge(challenge: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await this.supabase.from('interval_challenges').insert([{ ...challenge, user_id: user.id }]).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createIntervalChallenge');
    }
  }

  public async getChallengeHabits(challengeId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.from('challenge_habits').select('*').eq('challenge_id', challengeId).order('order_index');
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getChallengeHabits');
    }
  }

  public async createChallengeHabit(habit: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await this.supabase.from('challenge_habits').insert([{ ...habit, user_id: user.id }]).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'createChallengeHabit');
    }
  }

  public async getChallengeCompletions(challengeId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.from('challenge_completions').select('*').eq('challenge_id', challengeId).gte('date', startDate).lte('date', endDate);
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getChallengeCompletions');
    }
  }

  public async toggleChallengeCompletion(habitId: string, challengeId: string, date: string, completed: boolean): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await this.supabase.from('challenge_completions').upsert([{
        habit_id: habitId, challenge_id: challengeId, date, completed, user_id: user.id,
      }], { onConflict: 'habit_id,date' }).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'toggleChallengeCompletion');
    }
  }

  public async updateIntervalChallenge(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase.from('interval_challenges').update(updates).eq('id', id).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'updateIntervalChallenge');
    }
  }

  public async deleteIntervalChallenge(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('interval_challenges').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteIntervalChallenge');
    }
  }

  public async deleteChallengeHabit(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('challenge_habits').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteChallengeHabit');
    }
  }

  // ==================== USER PROFILE ====================

  public async getUserProfile(): Promise<any | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    } catch (error) {
      this.handleError(error, 'getUserProfile');
    }
  }

  public async upsertUserProfile(profile: any): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('profiles')
        .upsert([{ id: user.id, ...profile }], { onConflict: 'id' })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      this.handleError(error, 'upsertUserProfile');
    }
  }

  // ==================== EVENT PLANNER (EO) ====================

  /**
   * Helper to get active profile ID
   */
  private getActiveProfileId(): string | null {
    try {
      return localStorage.getItem('stillmove_active_profile_id') || null;
    } catch {
      return null;
    }
  }

  // --- Events ---
  public async getEvents(): Promise<PlannerEvent[]> {
    const profileId = this.getActiveProfileId();
    const fallback = async (): Promise<PlannerEvent[]> => {
      const cached = await cacheService.getAll(STORES.events);
      if (profileId) {
        return cached.filter((e: PlannerEvent) => e.profile_id === profileId || !e.profile_id);
      }
      return cached;
    };

    try {
      let query = this.supabase.from('events').select('*').order('start_date', { ascending: true });
      if (profileId) {
        query = query.or(`profile_id.eq.${profileId},profile_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        this.syncInBackground(STORES.events, async () => data);
        return data;
      }
      return await fallback();
    } catch {
      return await fallback();
    }
  }

  public async getEvent(id: string): Promise<PlannerEvent | null> {
    try {
      const { data, error } = await this.supabase.from('events').select('*').eq('id', id).single();
      if (error) throw error;
      return data || null;
    } catch {
      const cached = await cacheService.get(STORES.events, id);
      return cached || null;
    }
  }

  public async createEvent(event: Omit<PlannerEvent, 'id' | 'created_at' | 'updated_at'>): Promise<PlannerEvent> {
    const profileId = this.getActiveProfileId();
    const newId = crypto.randomUUID();
    const { data: { user } } = await this.supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const newEvent: PlannerEvent = {
      ...event,
      id: newId,
      user_id: user?.id,
      profile_id: profileId || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.supabase.from('events').insert([newEvent]).select();
      if (error) throw error;
      const created = data?.[0] || newEvent;
      await cacheService.put(STORES.events, created);
      return created;
    } catch {
      await cacheService.put(STORES.events, newEvent);
      return newEvent;
    }
  }

  public async updateEvent(id: string, updates: Partial<PlannerEvent>): Promise<PlannerEvent> {
    const updatedRecord = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.supabase.from('events').update(updatedRecord).eq('id', id).select();
      if (error) throw error;
      const res = data?.[0] || { id, ...updates };
      await cacheService.put(STORES.events, res);
      return res as PlannerEvent;
    } catch {
      const existing = (await cacheService.get(STORES.events, id)) || {};
      const res = { ...existing, ...updatedRecord, id };
      await cacheService.put(STORES.events, res);
      return res as PlannerEvent;
    }
  }

  public async deleteEvent(id: string): Promise<void> {
    try {
      await this.supabase.from('events').delete().eq('id', id);
    } catch {
      // offline fallback
    }
    await cacheService.delete(STORES.events, id);
  }

  // --- Rundown / Run-of-Show ---
  public async getEventRundown(eventId: string): Promise<EventRundownItem[]> {
    const fallback = async (): Promise<EventRundownItem[]> => {
      const cached = await cacheService.getAll(STORES.eventRundowns);
      return cached
        .filter((r: EventRundownItem) => r.event_id === eventId)
        .sort((a: EventRundownItem, b: EventRundownItem) => a.order_index - b.order_index || a.start_time.localeCompare(b.start_time));
    };

    try {
      const { data, error } = await this.supabase
        .from('event_rundowns')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      if (data) {
        await cacheService.putAll(STORES.eventRundowns, data);
        return data;
      }
      return await fallback();
    } catch {
      return await fallback();
    }
  }

  public async createRundownItem(item: Omit<EventRundownItem, 'id' | 'created_at'>): Promise<EventRundownItem> {
    const { data: { user } } = await this.supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const newItem: EventRundownItem = {
      ...item,
      id: crypto.randomUUID(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.supabase.from('event_rundowns').insert([newItem]).select();
      if (error) throw error;
      const created = data?.[0] || newItem;
      await cacheService.put(STORES.eventRundowns, created);
      return created;
    } catch {
      await cacheService.put(STORES.eventRundowns, newItem);
      return newItem;
    }
  }

  public async updateRundownItem(id: string, updates: Partial<EventRundownItem>): Promise<EventRundownItem> {
    try {
      const { data, error } = await this.supabase.from('event_rundowns').update(updates).eq('id', id).select();
      if (error) throw error;
      const res = data?.[0] || { id, ...updates };
      await cacheService.put(STORES.eventRundowns, res);
      return res as EventRundownItem;
    } catch {
      const existing = (await cacheService.get(STORES.eventRundowns, id)) || {};
      const res = { ...existing, ...updates, id };
      await cacheService.put(STORES.eventRundowns, res);
      return res as EventRundownItem;
    }
  }

  public async deleteRundownItem(id: string): Promise<void> {
    try {
      await this.supabase.from('event_rundowns').delete().eq('id', id);
    } catch {
      // offline
    }
    await cacheService.delete(STORES.eventRundowns, id);
  }

  // --- Crew / Kepanitiaan ---
  public async getEventCrew(eventId: string): Promise<EventCrewMember[]> {
    const fallback = async (): Promise<EventCrewMember[]> => {
      const cached = await cacheService.getAll(STORES.eventCrew);
      return cached
        .filter((c: EventCrewMember) => c.event_id === eventId)
        .sort((a: EventCrewMember, b: EventCrewMember) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name));
    };

    try {
      const { data, error } = await this.supabase
        .from('event_crew')
        .select('*')
        .eq('event_id', eventId)
        .order('division', { ascending: true })
        .order('order_index', { ascending: true });
      if (error) throw error;
      if (data) {
        await cacheService.putAll(STORES.eventCrew, data);
        return data;
      }
      return await fallback();
    } catch {
      return await fallback();
    }
  }

  public async createCrewMember(member: Omit<EventCrewMember, 'id' | 'created_at'>): Promise<EventCrewMember> {
    const { data: { user } } = await this.supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const newMember: EventCrewMember = {
      ...member,
      id: crypto.randomUUID(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.supabase.from('event_crew').insert([newMember]).select();
      if (error) throw error;
      const created = data?.[0] || newMember;
      await cacheService.put(STORES.eventCrew, created);
      return created;
    } catch {
      await cacheService.put(STORES.eventCrew, newMember);
      return newMember;
    }
  }

  public async updateCrewMember(id: string, updates: Partial<EventCrewMember>): Promise<EventCrewMember> {
    try {
      const { data, error } = await this.supabase.from('event_crew').update(updates).eq('id', id).select();
      if (error) throw error;
      const res = data?.[0] || { id, ...updates };
      await cacheService.put(STORES.eventCrew, res);
      return res as EventCrewMember;
    } catch {
      const existing = (await cacheService.get(STORES.eventCrew, id)) || {};
      const res = { ...existing, ...updates, id };
      await cacheService.put(STORES.eventCrew, res);
      return res as EventCrewMember;
    }
  }

  public async deleteCrewMember(id: string): Promise<void> {
    try {
      await this.supabase.from('event_crew').delete().eq('id', id);
    } catch {
      // offline
    }
    await cacheService.delete(STORES.eventCrew, id);
  }

  // --- Budget & RAB ---
  public async getEventBudget(eventId: string): Promise<EventBudgetItem[]> {
    const fallback = async (): Promise<EventBudgetItem[]> => {
      const cached = await cacheService.getAll(STORES.eventBudget);
      return cached.filter((b: EventBudgetItem) => b.event_id === eventId);
    };

    try {
      const { data, error } = await this.supabase
        .from('event_budget')
        .select('*')
        .eq('event_id', eventId)
        .order('category', { ascending: true })
        .order('order_index', { ascending: true });
      if (error) throw error;
      if (data) {
        await cacheService.putAll(STORES.eventBudget, data);
        return data;
      }
      return await fallback();
    } catch {
      return await fallback();
    }
  }

  public async createBudgetItem(item: Omit<EventBudgetItem, 'id' | 'created_at'>): Promise<EventBudgetItem> {
    const { data: { user } } = await this.supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const newItem: EventBudgetItem = {
      ...item,
      id: crypto.randomUUID(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.supabase.from('event_budget').insert([newItem]).select();
      if (error) throw error;
      const created = data?.[0] || newItem;
      await cacheService.put(STORES.eventBudget, created);
      return created;
    } catch {
      await cacheService.put(STORES.eventBudget, newItem);
      return newItem;
    }
  }

  public async updateBudgetItem(id: string, updates: Partial<EventBudgetItem>): Promise<EventBudgetItem> {
    try {
      const { data, error } = await this.supabase.from('event_budget').update(updates).eq('id', id).select();
      if (error) throw error;
      const res = data?.[0] || { id, ...updates };
      await cacheService.put(STORES.eventBudget, res);
      return res as EventBudgetItem;
    } catch {
      const existing = (await cacheService.get(STORES.eventBudget, id)) || {};
      const res = { ...existing, ...updates, id };
      await cacheService.put(STORES.eventBudget, res);
      return res as EventBudgetItem;
    }
  }

  public async deleteBudgetItem(id: string): Promise<void> {
    try {
      await this.supabase.from('event_budget').delete().eq('id', id);
    } catch {
      // offline
    }
    await cacheService.delete(STORES.eventBudget, id);
  }

  // --- Logistics & Equipment ---
  public async getEventLogistics(eventId: string): Promise<EventLogisticsItem[]> {
    const fallback = async (): Promise<EventLogisticsItem[]> => {
      const cached = await cacheService.getAll(STORES.eventLogistics);
      return cached.filter((l: EventLogisticsItem) => l.event_id === eventId);
    };

    try {
      const { data, error } = await this.supabase
        .from('event_logistics')
        .select('*')
        .eq('event_id', eventId)
        .order('category', { ascending: true })
        .order('order_index', { ascending: true });
      if (error) throw error;
      if (data) {
        await cacheService.putAll(STORES.eventLogistics, data);
        return data;
      }
      return await fallback();
    } catch {
      return await fallback();
    }
  }

  public async createLogisticsItem(item: Omit<EventLogisticsItem, 'id' | 'created_at'>): Promise<EventLogisticsItem> {
    const { data: { user } } = await this.supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const newItem: EventLogisticsItem = {
      ...item,
      id: crypto.randomUUID(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.supabase.from('event_logistics').insert([newItem]).select();
      if (error) throw error;
      const created = data?.[0] || newItem;
      await cacheService.put(STORES.eventLogistics, created);
      return created;
    } catch {
      await cacheService.put(STORES.eventLogistics, newItem);
      return newItem;
    }
  }

  public async updateLogisticsItem(id: string, updates: Partial<EventLogisticsItem>): Promise<EventLogisticsItem> {
    try {
      const { data, error } = await this.supabase.from('event_logistics').update(updates).eq('id', id).select();
      if (error) throw error;
      const res = data?.[0] || { id, ...updates };
      await cacheService.put(STORES.eventLogistics, res);
      return res as EventLogisticsItem;
    } catch {
      const existing = (await cacheService.get(STORES.eventLogistics, id)) || {};
      const res = { ...existing, ...updates, id };
      await cacheService.put(STORES.eventLogistics, res);
      return res as EventLogisticsItem;
    }
  }

  public async deleteLogisticsItem(id: string): Promise<void> {
    try {
      await this.supabase.from('event_logistics').delete().eq('id', id);
    } catch {
      // offline
    }
    await cacheService.delete(STORES.eventLogistics, id);
  }

  // --- Vendors & Talent ---
  public async getEventVendors(eventId: string): Promise<EventVendor[]> {
    const fallback = async (): Promise<EventVendor[]> => {
      const cached = await cacheService.getAll(STORES.eventVendors);
      return cached.filter((v: EventVendor) => v.event_id === eventId);
    };

    try {
      const { data, error } = await this.supabase
        .from('event_vendors')
        .select('*')
        .eq('event_id', eventId)
        .order('category', { ascending: true })
        .order('order_index', { ascending: true });
      if (error) throw error;
      if (data) {
        await cacheService.putAll(STORES.eventVendors, data);
        return data;
      }
      return await fallback();
    } catch {
      return await fallback();
    }
  }

  public async createVendor(vendor: Omit<EventVendor, 'id' | 'created_at'>): Promise<EventVendor> {
    const { data: { user } } = await this.supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const newVendor: EventVendor = {
      ...vendor,
      id: crypto.randomUUID(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.supabase.from('event_vendors').insert([newVendor]).select();
      if (error) throw error;
      const created = data?.[0] || newVendor;
      await cacheService.put(STORES.eventVendors, created);
      return created;
    } catch {
      await cacheService.put(STORES.eventVendors, newVendor);
      return newVendor;
    }
  }

  public async updateVendor(id: string, updates: Partial<EventVendor>): Promise<EventVendor> {
    try {
      const { data, error } = await this.supabase.from('event_vendors').update(updates).eq('id', id).select();
      if (error) throw error;
      const res = data?.[0] || { id, ...updates };
      await cacheService.put(STORES.eventVendors, res);
      return res as EventVendor;
    } catch {
      const existing = (await cacheService.get(STORES.eventVendors, id)) || {};
      const res = { ...existing, ...updates, id };
      await cacheService.put(STORES.eventVendors, res);
      return res as EventVendor;
    }
  }

  public async deleteVendor(id: string): Promise<void> {
    try {
      await this.supabase.from('event_vendors').delete().eq('id', id);
    } catch {
      // offline
    }
    await cacheService.delete(STORES.eventVendors, id);
  }

  // --- Milestones ---
  public async getEventMilestones(eventId: string): Promise<EventMilestone[]> {
    const fallback = async (): Promise<EventMilestone[]> => {
      const cached = await cacheService.getAll(STORES.eventMilestones);
      return cached.filter((m: EventMilestone) => m.event_id === eventId);
    };

    try {
      const { data, error } = await this.supabase
        .from('event_milestones')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      if (data) {
        await cacheService.putAll(STORES.eventMilestones, data);
        return data;
      }
      return await fallback();
    } catch {
      return await fallback();
    }
  }

  public async createMilestone(milestone: Omit<EventMilestone, 'id' | 'created_at'>): Promise<EventMilestone> {
    const { data: { user } } = await this.supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const newMilestone: EventMilestone = {
      ...milestone,
      id: crypto.randomUUID(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.supabase.from('event_milestones').insert([newMilestone]).select();
      if (error) throw error;
      const created = data?.[0] || newMilestone;
      await cacheService.put(STORES.eventMilestones, created);
      return created;
    } catch {
      await cacheService.put(STORES.eventMilestones, newMilestone);
      return newMilestone;
    }
  }

  public async toggleMilestone(id: string, is_completed: boolean): Promise<EventMilestone> {
    const updates = {
      is_completed,
      completed_at: is_completed ? new Date().toISOString() : null,
    };

    try {
      const { data, error } = await this.supabase.from('event_milestones').update(updates).eq('id', id).select();
      if (error) throw error;
      const res = data?.[0] || { id, ...updates };
      await cacheService.put(STORES.eventMilestones, res);
      return res as EventMilestone;
    } catch {
      const existing = (await cacheService.get(STORES.eventMilestones, id)) || {};
      const res = { ...existing, ...updates, id };
      await cacheService.put(STORES.eventMilestones, res);
      return res as EventMilestone;
    }
  }

  public async deleteMilestone(id: string): Promise<void> {
    try {
      await this.supabase.from('event_milestones').delete().eq('id', id);
    } catch {
      // offline
    }
    await cacheService.delete(STORES.eventMilestones, id);
  }

  // ==================== PANTRY / FRIDGE TRACKER ====================

  public async getPantryItems(profileId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('pantry_items')
        .select('*')
        .eq('profile_id', profileId)
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getPantryItems');
    }
  }

  public async createPantryItem(data: any): Promise<any> {
    const { data: { user } } = await this.supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const payload = {
      ...data,
      user_id: user?.id,
    };
    const { data: result, error } = await this.supabase
      .from('pantry_items')
      .insert([payload])
      .select();
    if (error) this.handleError(error, 'createPantryItem');
    return result![0];
  }

  public async updatePantryItem(id: string, data: any): Promise<any> {
    const { data: result, error } = await this.supabase
      .from('pantry_items')
      .update(data)
      .eq('id', id)
      .select();
    if (error) this.handleError(error, 'updatePantryItem');
    return result![0];
  }

  public async deletePantryItem(id: string): Promise<void> {
    const { error } = await this.supabase.from('pantry_items').delete().eq('id', id);
    if (error) this.handleError(error, 'deletePantryItem');
  }

  /**
   * Quick-consume: set fraction and recalculate quantity_remaining
   */
  public async consumePantryItem(
    id: string,
    fraction: string,
    quantityInitial: number
  ): Promise<any> {
    const fractionMap: Record<string, number> = {
      full: 1,
      'three-quarters': 0.75,
      half: 0.5,
      quarter: 0.25,
      empty: 0,
    };
    const multiplier = fractionMap[fraction] ?? 1;
    const quantity_remaining = parseFloat((quantityInitial * multiplier).toFixed(2));
    return this.updatePantryItem(id, { quantity_fraction: fraction, quantity_remaining });
  }
}

const dataService = new DataService();
export default dataService;


