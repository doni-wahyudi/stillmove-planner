import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/Toast/Toast';
import dataService from '@/services/DataService';
import type {
  PantryItem,
  PantryItemFormData,
  StorageLocation,
  PantryCategory,
  QuantityUnit,
  QuantityFraction,
  FreshnessStatus,
} from '@/types/pantry';
import './PantryPage.css';

// ─────────────────────── Constants ───────────────────────
const STORAGE_LOCATIONS: StorageLocation[] = [
  'Kulkas Atas',
  'Kulkas Bawah',
  'Freezer',
  'Lemari Dapur',
  'Meja Dapur',
];

const PANTRY_CATEGORIES: PantryCategory[] = [
  'Sayuran',
  'Buah',
  'Daging/Protein',
  'Bumbu & Rempah',
  'Minuman',
  'Susu & Olahan',
  'Karbohidrat',
  'Makanan Beku',
  'Saus & Kondimen',
  'Other',
];

const QUANTITY_UNITS: QuantityUnit[] = [
  'gram', 'kg', 'ml', 'liter', 'pcs', 'botol', 'bungkus', 'kaleng', 'sachet', 'buah',
];

const FRACTION_STEPS: { value: QuantityFraction; label: string; pct: number }[] = [
  { value: 'empty', label: 'Habis', pct: 0 },
  { value: 'quarter', label: '¼', pct: 25 },
  { value: 'half', label: '½', pct: 50 },
  { value: 'three-quarters', label: '¾', pct: 75 },
  { value: 'full', label: 'Full', pct: 100 },
];

const CATEGORY_EMOJIS: Record<PantryCategory, string> = {
  'Sayuran': '🥦',
  'Buah': '🍎',
  'Daging/Protein': '🥩',
  'Bumbu & Rempah': '🧄',
  'Minuman': '🥤',
  'Susu & Olahan': '🥛',
  'Karbohidrat': '🍚',
  'Makanan Beku': '🧊',
  'Saus & Kondimen': '🫙',
  'Other': '🥡',
};

const STORAGE_ICONS: Record<StorageLocation, string> = {
  'Kulkas Atas': '🧊',
  'Kulkas Bawah': '❄️',
  'Freezer': '🌨️',
  'Lemari Dapur': '🗄️',
  'Meja Dapur': '🍳',
};

const DEFAULT_FORM: PantryItemFormData = {
  name: '',
  emoji: '🥦',
  category: 'Sayuran',
  storage_location: 'Kulkas Atas',
  brand: '',
  quantity_initial: 1,
  quantity_unit: 'pcs',
  quantity_remaining: 1,
  quantity_fraction: 'full',
  purchase_date: new Date().toISOString().split('T')[0],
  expired_date: '',
  shelf_life_days: '',
  notes: '',
};

// ─────────────────────── Helpers ───────────────────────
function getFreshnessStatus(item: PantryItem): FreshnessStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (item.quantity_fraction === 'empty') return 'expired';

  if (item.expired_date) {
    const exp = new Date(item.expired_date);
    const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 2) return 'critical';
    if (daysLeft <= 5) return 'warning';
    return 'fresh';
  }

  if (item.shelf_life_days) {
    const bought = new Date(item.purchase_date);
    const daysOld = Math.ceil((today.getTime() - bought.getTime()) / (1000 * 60 * 60 * 24));
    const pctLeft = 1 - daysOld / item.shelf_life_days;
    if (pctLeft < 0) return 'expired';
    if (pctLeft < 0.2) return 'critical';
    if (pctLeft < 0.4) return 'warning';
    if (pctLeft < 0.7) return 'ok';
    return 'fresh';
  }

  return 'unknown';
}

function getDaysUntilExpiry(item: PantryItem): number | null {
  if (!item.expired_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(item.expired_date);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getConsumptionPct(item: PantryItem): number {
  if (item.quantity_initial === 0) return 0;
  return Math.min(100, Math.round((item.quantity_remaining / item.quantity_initial) * 100));
}

// ─────────────────────── Quick Recipe Ideas ───────────────────────
const RECIPE_PATTERNS: { keywords: string[]; recipe: string; emoji: string }[] = [
  { keywords: ['telur', 'egg'], recipe: 'Telur Dadar / Omelette', emoji: '🍳' },
  { keywords: ['ayam', 'chicken'], recipe: 'Ayam Goreng / Chicken Stir-fry', emoji: '🍗' },
  { keywords: ['sayur', 'bayam', 'kangkung', 'wortel'], recipe: 'Tumis Sayuran', emoji: '🥗' },
  { keywords: ['nasi', 'beras'], recipe: 'Nasi Goreng Sederhana', emoji: '🍳' },
  { keywords: ['mie', 'pasta', 'spagetti'], recipe: 'Mie / Pasta Goreng', emoji: '🍝' },
  { keywords: ['kentang', 'potato'], recipe: 'Kentang Goreng / Kukus', emoji: '🥔' },
  { keywords: ['tomat', 'tomato', 'bawang'], recipe: 'Sambal / Tumis Bawang', emoji: '🥫' },
  { keywords: ['tahu', 'tempe'], recipe: 'Tahu/Tempe Goreng Krispi', emoji: '🟡' },
  { keywords: ['susu', 'milk', 'keju', 'cheese'], recipe: 'Smoothie / Milkshake', emoji: '🥛' },
  { keywords: ['pisang', 'banana', 'buah', 'fruit'], recipe: 'Salad Buah / Jus', emoji: '🍌' },
];

function getSuggestedRecipes(items: PantryItem[]): { recipe: string; emoji: string }[] {
  const names = items
    .filter((i) => i.quantity_fraction !== 'empty')
    .map((i) => i.name.toLowerCase());
  const found: { recipe: string; emoji: string }[] = [];
  for (const pattern of RECIPE_PATTERNS) {
    if (pattern.keywords.some((kw) => names.some((n) => n.includes(kw)))) {
      found.push({ recipe: pattern.recipe, emoji: pattern.emoji });
    }
    if (found.length >= 4) break;
  }
  return found;
}

// ─────────────────────── Component ───────────────────────
export function PantryPage() {
  const { activeProfile } = useProfile();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list' | 'shopping'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterFreshness, setFilterFreshness] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [form, setForm] = useState<PantryItemFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [consumingId, setConsumingId] = useState<string | null>(null);
  const [showRecipes, setShowRecipes] = useState(false);

  // ── Load Data ──
  const loadItems = useCallback(async () => {
    if (!activeProfile?.id) return;
    setLoading(true);
    try {
      const data = await dataService.getPantryItems(activeProfile.id);
      setItems(data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load pantry items', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ── Derived KPIs ──
  const kpis = useMemo(() => {
    const total = items.length;
    const fresh = items.filter((i) => {
      const s = getFreshnessStatus(i);
      return s === 'fresh' || s === 'ok' || s === 'unknown';
    }).length;
    const warning = items.filter((i) => getFreshnessStatus(i) === 'warning').length;
    const critical = items.filter((i) => getFreshnessStatus(i) === 'critical').length;
    const expired = items.filter((i) => getFreshnessStatus(i) === 'expired').length;
    const lowStock = items.filter((i) => {
      const pct = getConsumptionPct(i);
      return pct <= 25 && i.quantity_fraction !== 'empty';
    }).length;
    const shoppingCount = items.filter(
      (i) => i.quantity_fraction === 'empty' || getConsumptionPct(i) <= 25
    ).length;
    return { total, fresh, warning, critical, expired, lowStock, shoppingCount };
  }, [items]);

  // ── Filtered Items ──
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterLocation !== 'all' && item.storage_location !== filterLocation) return false;
      if (filterFreshness !== 'all') {
        const status = getFreshnessStatus(item);
        if (filterFreshness === 'critical' && status !== 'critical' && status !== 'expired') return false;
        if (filterFreshness === 'ok' && status !== 'fresh' && status !== 'ok' && status !== 'unknown') return false;
        if (filterFreshness === 'empty' && item.quantity_fraction !== 'empty') return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !item.name.toLowerCase().includes(q) &&
          !item.category.toLowerCase().includes(q) &&
          !item.brand.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, filterCategory, filterLocation, filterFreshness, searchQuery]);

  // ── Shopping List ──
  const shoppingList = useMemo(() => {
    return items.filter(
      (i) => i.quantity_fraction === 'empty' || getConsumptionPct(i) <= 25
    );
  }, [items]);

  // ── Recipe Suggestions ──
  const recipes = useMemo(() => getSuggestedRecipes(items), [items]);

  // ── Form Handlers ──
  const openAddModal = () => {
    setEditItem(null);
    setForm(DEFAULT_FORM);
    setShowAddModal(true);
  };

  const openEditModal = (item: PantryItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      emoji: item.emoji,
      category: item.category,
      storage_location: item.storage_location,
      brand: item.brand || '',
      quantity_initial: item.quantity_initial,
      quantity_unit: item.quantity_unit,
      quantity_remaining: item.quantity_remaining,
      quantity_fraction: item.quantity_fraction,
      purchase_date: item.purchase_date,
      expired_date: item.expired_date || '',
      shelf_life_days: item.shelf_life_days?.toString() || '',
      notes: item.notes || '',
    });
    setShowAddModal(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-set emoji when category changes
      if (name === 'category') {
        updated.emoji = CATEGORY_EMOJIS[value as PantryCategory] || '🥡';
      }
      // Sync quantity_remaining with quantity_initial when adding new item
      if (name === 'quantity_initial' && !editItem) {
        updated.quantity_remaining = parseFloat(value) || 1;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        profile_id: activeProfile.id,
        name: form.name.trim(),
        emoji: form.emoji,
        category: form.category,
        storage_location: form.storage_location,
        brand: form.brand.trim(),
        quantity_initial: Number(form.quantity_initial),
        quantity_unit: form.quantity_unit,
        quantity_remaining: Number(form.quantity_remaining),
        quantity_fraction: form.quantity_fraction,
        purchase_date: form.purchase_date,
        expired_date: form.expired_date || null,
        shelf_life_days: form.shelf_life_days ? parseInt(form.shelf_life_days) : null,
        notes: form.notes.trim(),
      };

      if (editItem) {
        const updated = await dataService.updatePantryItem(editItem.id, payload);
        setItems((prev) => prev.map((i) => (i.id === editItem.id ? updated : i)));
        showToast(language === 'id' ? 'Bahan berhasil diperbarui!' : 'Item updated!', 'success');
      } else {
        const created = await dataService.createPantryItem(payload);
        setItems((prev) => [created, ...prev]);
        showToast(language === 'id' ? 'Bahan berhasil ditambahkan!' : 'Item added!', 'success');
      }
      setShowAddModal(false);
    } catch (err: any) {
      showToast(err.message || 'Error saving item', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: PantryItem) => {
    if (!confirm(language === 'id' ? `Hapus "${item.name}"?` : `Delete "${item.name}"?`)) return;
    try {
      await dataService.deletePantryItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(language === 'id' ? 'Bahan dihapus.' : 'Item deleted.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error deleting item', 'error');
    }
  };

  const handleConsume = async (item: PantryItem, fraction: QuantityFraction) => {
    setConsumingId(item.id);
    try {
      const updated = await dataService.consumePantryItem(item.id, fraction, item.quantity_initial);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...updated } : i)));
    } catch (err: any) {
      showToast(err.message || 'Error updating consumption', 'error');
    } finally {
      setConsumingId(null);
    }
  };

  // ── Export Shopping List ──
  const handleExportShopping = () => {
    const lines = shoppingList.map(
      (i) => `${i.emoji} ${i.name}${i.brand ? ` (${i.brand})` : ''} — ${i.quantity_unit}`
    );
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      showToast(
        language === 'id' ? '✅ Daftar belanja disalin ke clipboard!' : '✅ Shopping list copied!',
        'success'
      );
    });
  };

  // ─────────────────────── RENDER ───────────────────────
  const freshnessColor: Record<FreshnessStatus, string> = {
    fresh: '#22c55e',
    ok: '#84cc16',
    warning: '#f59e0b',
    critical: '#ef4444',
    expired: '#6b7280',
    unknown: '#94a3b8',
  };

  const freshnessLabel: Record<FreshnessStatus, string> = {
    fresh: language === 'id' ? 'Segar' : 'Fresh',
    ok: language === 'id' ? 'Baik' : 'Good',
    warning: language === 'id' ? 'Segera Pakai' : 'Use Soon',
    critical: language === 'id' ? 'Hampir Kadaluarsa' : 'Expiring Soon',
    expired: language === 'id' ? 'Habis / Expired' : 'Used Up / Expired',
    unknown: language === 'id' ? 'Tidak Ada Info' : 'No Info',
  };

  return (
    <div className="pantry-page">
      {/* ── Header ── */}
      <div className="pantry-header">
        <div className="pantry-header-left">
          <h1 className="pantry-title">
            🧊 {t('pantry.title')}
          </h1>
          <p className="pantry-subtitle">{t('pantry.subtitle')}</p>
        </div>
        <div className="pantry-header-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowRecipes(!showRecipes)}
            title={t('pantry.recipeIdeas')}
          >
            🍳 {t('pantry.recipeIdeas')}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            + {t('pantry.addItem')}
          </button>
        </div>
      </div>

      {/* ── Recipe Suggestions Banner ── */}
      {showRecipes && recipes.length > 0 && (
        <div className="pantry-recipes-banner">
          <div className="recipes-banner-title">
            💡 {t('pantry.recipeSuggestions')}
          </div>
          <div className="recipes-list">
            {recipes.map((r, i) => (
              <span key={i} className="recipe-chip">
                {r.emoji} {r.recipe}
              </span>
            ))}
          </div>
          <button className="recipes-close" onClick={() => setShowRecipes(false)}>×</button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="pantry-kpi-grid">
        <div className="pantry-kpi-card">
          <span className="pantry-kpi-icon">📦</span>
          <div>
            <div className="pantry-kpi-val">{kpis.total}</div>
            <div className="pantry-kpi-label">{t('pantry.totalItems')}</div>
          </div>
        </div>
        <div className="pantry-kpi-card pantry-kpi-fresh">
          <span className="pantry-kpi-icon">🟢</span>
          <div>
            <div className="pantry-kpi-val">{kpis.fresh}</div>
            <div className="pantry-kpi-label">{t('pantry.freshItems')}</div>
          </div>
        </div>
        <div className="pantry-kpi-card pantry-kpi-warning">
          <span className="pantry-kpi-icon">🟡</span>
          <div>
            <div className="pantry-kpi-val">{kpis.warning}</div>
            <div className="pantry-kpi-label">{t('pantry.warnItems')}</div>
          </div>
        </div>
        <div className="pantry-kpi-card pantry-kpi-critical">
          <span className="pantry-kpi-icon">🔴</span>
          <div>
            <div className="pantry-kpi-val">{kpis.critical + kpis.expired}</div>
            <div className="pantry-kpi-label">{t('pantry.criticalItems')}</div>
          </div>
        </div>
        <div
          className="pantry-kpi-card pantry-kpi-shopping"
          onClick={() => setView('shopping')}
          style={{ cursor: 'pointer' }}
        >
          <span className="pantry-kpi-icon">🛒</span>
          <div>
            <div className="pantry-kpi-val">{kpis.shoppingCount}</div>
            <div className="pantry-kpi-label">{t('pantry.needRestock')}</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="pantry-toolbar">
        <div className="pantry-search-wrap">
          <span className="pantry-search-icon">🔍</span>
          <input
            type="text"
            className="pantry-search"
            placeholder={t('pantry.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="pantry-filter-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">{t('pantry.allCategories')}</option>
          {PANTRY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_EMOJIS[c]} {c}
            </option>
          ))}
        </select>

        <select
          className="pantry-filter-select"
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
        >
          <option value="all">{t('pantry.allLocations')}</option>
          {STORAGE_LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {STORAGE_ICONS[l]} {l}
            </option>
          ))}
        </select>

        <select
          className="pantry-filter-select"
          value={filterFreshness}
          onChange={(e) => setFilterFreshness(e.target.value)}
        >
          <option value="all">{t('pantry.allFreshness')}</option>
          <option value="ok">🟢 {language === 'id' ? 'Masih Baik' : 'Still Good'}</option>
          <option value="critical">🔴 {language === 'id' ? 'Hampir Kadaluarsa' : 'Critical'}</option>
          <option value="empty">⬜ {language === 'id' ? 'Habis' : 'Empty'}</option>
        </select>

        <div className="pantry-view-toggle">
          <button
            className={`pantry-view-btn ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
            title="Grid View"
          >⊞</button>
          <button
            className={`pantry-view-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
            title="List View"
          >☰</button>
          <button
            className={`pantry-view-btn ${view === 'shopping' ? 'active' : ''}`}
            onClick={() => setView('shopping')}
            title="Shopping List"
          >🛒</button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="pantry-loading">
          <div className="spinner" />
          <p>{t('common.loading')}</p>
        </div>
      ) : view === 'shopping' ? (
        /* ── Shopping List View ── */
        <div className="pantry-shopping-view">
          <div className="shopping-list-header">
            <h2>🛒 {t('pantry.shoppingList')}</h2>
            <button className="btn btn-ghost btn-sm" onClick={handleExportShopping}>
              📋 {t('pantry.copyList')}
            </button>
          </div>
          {shoppingList.length === 0 ? (
            <div className="pantry-empty">
              <span className="pantry-empty-icon">🎉</span>
              <p>{t('pantry.shoppingListEmpty')}</p>
            </div>
          ) : (
            <div className="shopping-items-list">
              {shoppingList.map((item) => (
                <div key={item.id} className="shopping-item">
                  <span className="shopping-item-emoji">{item.emoji}</span>
                  <div className="shopping-item-info">
                    <span className="shopping-item-name">{item.name}</span>
                    {item.brand && <span className="shopping-item-brand">{item.brand}</span>}
                    <span className="shopping-item-unit">{item.quantity_unit}</span>
                  </div>
                  <div className="shopping-item-reason">
                    {item.quantity_fraction === 'empty'
                      ? (language === 'id' ? '⬜ Habis' : '⬜ Empty')
                      : `⚠️ ${getConsumptionPct(item)}% ${language === 'id' ? 'tersisa' : 'left'}`}
                  </div>
                  <span className="shopping-item-location">
                    {STORAGE_ICONS[item.storage_location]} {item.storage_location}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : view === 'list' ? (
        /* ── List View (grouped by location) ── */
        <div className="pantry-list-view">
          {STORAGE_LOCATIONS.map((loc) => {
            const locItems = filtered.filter((i) => i.storage_location === loc);
            if (locItems.length === 0) return null;
            return (
              <div key={loc} className="pantry-location-group">
                <div className="pantry-location-header">
                  {STORAGE_ICONS[loc]} {loc}
                  <span className="location-count">{locItems.length}</span>
                </div>
                <table className="pantry-table">
                  <thead>
                    <tr>
                      <th>{t('pantry.itemName')}</th>
                      <th>{t('pantry.category')}</th>
                      <th>{t('pantry.remaining')}</th>
                      <th>{t('pantry.purchaseDate')}</th>
                      <th>{t('pantry.freshness')}</th>
                      <th>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locItems.map((item) => {
                      const freshness = getFreshnessStatus(item);
                      const daysLeft = getDaysUntilExpiry(item);
                      return (
                        <tr key={item.id} className={`pantry-row freshness-${freshness}`}>
                          <td>
                            <span className="row-emoji">{item.emoji}</span>
                            <span className="row-name">{item.name}</span>
                            {item.brand && <span className="row-brand">{item.brand}</span>}
                          </td>
                          <td><span className="category-badge">{item.category}</span></td>
                          <td>
                            <div className="row-qty-wrap">
                              <span className="row-qty-val">
                                {item.quantity_remaining} {item.quantity_unit}
                              </span>
                              <div className="row-qty-bar">
                                <div
                                  className="row-qty-fill"
                                  style={{
                                    width: `${getConsumptionPct(item)}%`,
                                    background: freshnessColor[freshness],
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="row-date">{item.purchase_date}</td>
                          <td>
                            <span
                              className="freshness-badge"
                              style={{ background: `${freshnessColor[freshness]}22`, color: freshnessColor[freshness] }}
                            >
                              {freshnessLabel[freshness]}
                              {daysLeft !== null && daysLeft >= 0 && ` (${daysLeft}d)`}
                            </span>
                          </td>
                          <td className="row-actions">
                            <button className="btn-icon" onClick={() => openEditModal(item)} title="Edit">✏️</button>
                            <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(item)} title="Delete">🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="pantry-empty">
              <span className="pantry-empty-icon">🔍</span>
              <p>{t('common.noData')}</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Grid View ── */
        <div className="pantry-grid">
          {filtered.length === 0 && !loading && (
            <div className="pantry-empty pantry-empty-grid">
              <span className="pantry-empty-icon">🧊</span>
              <p>{t('pantry.emptyState')}</p>
              <button className="btn btn-primary" onClick={openAddModal}>
                + {t('pantry.addFirstItem')}
              </button>
            </div>
          )}
          {filtered.map((item) => {
            const freshness = getFreshnessStatus(item);
            const pct = getConsumptionPct(item);
            const daysLeft = getDaysUntilExpiry(item);
            const isConsuming = consumingId === item.id;
            return (
              <div
                key={item.id}
                className={`pantry-card freshness-border-${freshness}`}
              >
                {/* Card Header */}
                <div className="pantry-card-header">
                  <div className="pantry-card-emoji">{item.emoji}</div>
                  <div className="pantry-card-title-wrap">
                    <h3 className="pantry-card-name">{item.name}</h3>
                    {item.brand && <span className="pantry-card-brand">{item.brand}</span>}
                  </div>
                  <div className="pantry-card-actions">
                    <button className="btn-icon" onClick={() => openEditModal(item)}>✏️</button>
                    <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(item)}>🗑️</button>
                  </div>
                </div>

                {/* Meta */}
                <div className="pantry-card-meta">
                  <span className="meta-chip meta-category">{CATEGORY_EMOJIS[item.category]} {item.category}</span>
                  <span className="meta-chip meta-location">{STORAGE_ICONS[item.storage_location]} {item.storage_location}</span>
                </div>

                {/* Freshness Badge */}
                <div
                  className="pantry-freshness-badge"
                  style={{ background: `${freshnessColor[freshness]}20`, color: freshnessColor[freshness] }}
                >
                  <span className="freshness-dot" style={{ background: freshnessColor[freshness] }} />
                  {freshnessLabel[freshness]}
                  {daysLeft !== null && (
                    <span className="freshness-days">
                      {daysLeft >= 0
                        ? ` · ${daysLeft}d ${language === 'id' ? 'lagi' : 'left'}`
                        : ` · ${language === 'id' ? 'Kadaluarsa' : 'Expired'}`}
                    </span>
                  )}
                </div>

                {/* Quantity Bar */}
                <div className="pantry-qty-section">
                  <div className="pantry-qty-labels">
                    <span>{t('pantry.remaining')}</span>
                    <span className="pantry-qty-val">
                      {item.quantity_remaining} / {item.quantity_initial} {item.quantity_unit}
                    </span>
                  </div>
                  <div className="pantry-qty-bar-track">
                    <div
                      className="pantry-qty-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: freshnessColor[freshness],
                      }}
                    />
                  </div>
                  <div className="pantry-qty-pct">{pct}%</div>
                </div>

                {/* Consumption Fraction Buttons */}
                <div className="pantry-consume-section">
                  <span className="consume-label">{t('pantry.quickConsume')}</span>
                  <div className="consume-btns">
                    {FRACTION_STEPS.map((step) => (
                      <button
                        key={step.value}
                        className={`consume-btn ${item.quantity_fraction === step.value ? 'consume-btn--active' : ''}`}
                        onClick={() => handleConsume(item, step.value)}
                        disabled={isConsuming}
                        title={`${step.pct}%`}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purchase Date */}
                <div className="pantry-card-footer">
                  <span className="footer-date">
                    🛍️ {item.purchase_date}
                  </span>
                  {item.expired_date && (
                    <span className="footer-exp">
                      ⏳ {item.expired_date}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showAddModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="planner-modal pantry-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="planner-modal-header">
              <h3>
                {editItem
                  ? `✏️ ${t('pantry.editItem')}`
                  : `+ ${t('pantry.addItem')}`}
              </h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="pantry-form">
              {/* Row 1: Emoji + Name */}
              <div className="form-row">
                <div className="form-group form-group--emoji">
                  <label>{t('pantry.emoji')}</label>
                  <input
                    type="text"
                    name="emoji"
                    className="form-input"
                    value={form.emoji}
                    onChange={handleFormChange}
                    maxLength={2}
                  />
                </div>
                <div className="form-group form-group--flex">
                  <label>{t('pantry.itemName')} *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder={language === 'id' ? 'cth. Telur Ayam' : 'e.g. Chicken Eggs'}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group form-group--flex">
                  <label>{t('pantry.brand')}</label>
                  <input
                    type="text"
                    name="brand"
                    className="form-input"
                    value={form.brand}
                    onChange={handleFormChange}
                    placeholder={language === 'id' ? 'Merek (opsional)' : 'Brand (optional)'}
                  />
                </div>
              </div>

              {/* Row 2: Category + Location */}
              <div className="form-row">
                <div className="form-group form-group--flex">
                  <label>{t('pantry.category')}</label>
                  <select
                    name="category"
                    className="form-input"
                    value={form.category}
                    onChange={handleFormChange}
                  >
                    {PANTRY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_EMOJIS[c]} {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group form-group--flex">
                  <label>{t('pantry.storageLocation')}</label>
                  <select
                    name="storage_location"
                    className="form-input"
                    value={form.storage_location}
                    onChange={handleFormChange}
                  >
                    {STORAGE_LOCATIONS.map((l) => (
                      <option key={l} value={l}>
                        {STORAGE_ICONS[l]} {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Quantity */}
              <div className="form-row">
                <div className="form-group form-group--qty">
                  <label>{t('pantry.quantityInitial')}</label>
                  <input
                    type="number"
                    name="quantity_initial"
                    className="form-input"
                    value={form.quantity_initial}
                    onChange={handleFormChange}
                    min="0"
                    step="any"
                  />
                </div>
                <div className="form-group form-group--qty">
                  <label>{t('pantry.quantityRemaining')}</label>
                  <input
                    type="number"
                    name="quantity_remaining"
                    className="form-input"
                    value={form.quantity_remaining}
                    onChange={handleFormChange}
                    min="0"
                    step="any"
                  />
                </div>
                <div className="form-group form-group--unit">
                  <label>{t('pantry.unit')}</label>
                  <select
                    name="quantity_unit"
                    className="form-input"
                    value={form.quantity_unit}
                    onChange={handleFormChange}
                  >
                    {QUANTITY_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Fraction Buttons */}
              <div className="form-group">
                <label>{t('pantry.currentLevel')}</label>
                <div className="fraction-btn-group">
                  {FRACTION_STEPS.map((step) => (
                    <button
                      key={step.value}
                      type="button"
                      className={`fraction-btn ${form.quantity_fraction === step.value ? 'fraction-btn--active' : ''}`}
                      onClick={() => {
                        const pct = step.pct / 100;
                        setForm((prev) => ({
                          ...prev,
                          quantity_fraction: step.value,
                          quantity_remaining: parseFloat((prev.quantity_initial * pct).toFixed(2)),
                        }));
                      }}
                    >
                      {step.label}
                      <small>{step.pct}%</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 5: Dates */}
              <div className="form-row">
                <div className="form-group form-group--flex">
                  <label>{t('pantry.purchaseDate')} *</label>
                  <input
                    type="date"
                    name="purchase_date"
                    className="form-input"
                    value={form.purchase_date}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group form-group--flex">
                  <label>{t('pantry.expiredDate')}</label>
                  <input
                    type="date"
                    name="expired_date"
                    className="form-input"
                    value={form.expired_date}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="form-group form-group--qty">
                  <label>{t('pantry.shelfLifeDays')}</label>
                  <input
                    type="number"
                    name="shelf_life_days"
                    className="form-input"
                    value={form.shelf_life_days}
                    onChange={handleFormChange}
                    min="1"
                    placeholder={language === 'id' ? 'hari' : 'days'}
                  />
                </div>
              </div>

              {/* Row 6: Notes */}
              <div className="form-group">
                <label>{t('common.notes')}</label>
                <textarea
                  name="notes"
                  className="form-input"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder={language === 'id' ? 'Catatan opsional...' : 'Optional notes...'}
                />
              </div>

              {/* Footer */}
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
                  {isSaving
                    ? t('common.loading')
                    : editItem
                    ? t('common.save')
                    : t('pantry.addItem')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PantryPage;
