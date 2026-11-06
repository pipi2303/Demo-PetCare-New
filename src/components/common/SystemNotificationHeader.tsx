import React, { useState } from 'react';
import { LucideIcon, Printer, Sliders } from 'lucide-react';
import { QuickPrintConfigModal, QuickPrintData } from './QuickPrintConfigModal';

export interface HeaderBadge {
  label: React.ReactNode;
  variant?: 'gold' | 'emerald' | 'rose' | 'blue' | 'purple' | 'amber' | 'neutral';
  icon?: LucideIcon;
  pulse?: boolean;
}

export interface HeaderTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number | string;
  badge?: string;
  badgeVariant?: 'gold' | 'emerald' | 'rose' | 'blue' | 'purple' | 'amber';
}

export interface HeaderStatItem {
  label: string;
  value: string | number;
  variant?: 'default' | 'rose' | 'amber' | 'emerald' | 'blue' | 'purple';
}

export interface SystemNotificationHeaderProps {
  icon?: LucideIcon | React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  badges?: (HeaderBadge | React.ReactNode)[];
  actions?: React.ReactNode;
  tabs?: HeaderTabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  stats?: HeaderStatItem[];
  children?: React.ReactNode;
  className?: string;
  enableQuickPrint?: boolean;
  quickPrintData?: QuickPrintData;
}

const badgeVariants: Record<string, string> = {
  gold: 'bg-[#B8905A]/20 text-[#D9B98A] border-[#B8905A]/30 font-semibold',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold',
  rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30 font-semibold',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30 font-semibold',
  amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-semibold',
  neutral: 'bg-white/10 text-[#EDE6D6] border-white/15 font-medium'
};

const statVariants: Record<string, { bg: string; text: string }> = {
  default: { bg: 'bg-[#101A2C]/70 border-white/10', text: 'text-[#FFFDF9]' },
  rose: { bg: 'bg-rose-950/40 border-rose-500/30', text: 'text-rose-300' },
  amber: { bg: 'bg-amber-950/40 border-amber-500/30', text: 'text-amber-300' },
  emerald: { bg: 'bg-emerald-950/40 border-emerald-500/30', text: 'text-emerald-300' },
  blue: { bg: 'bg-blue-950/40 border-blue-500/30', text: 'text-blue-300' },
  purple: { bg: 'bg-purple-950/40 border-purple-500/30', text: 'text-purple-300' }
};

export const SystemNotificationHeader: React.FC<SystemNotificationHeaderProps> = ({
  title,
  subtitle,
  description,
  badges,
  actions,
  tabs,
  activeTab,
  onTabChange,
  stats,
  children,
  className = '',
  enableQuickPrint = true,
  quickPrintData
}) => {
  const [showQuickPrintModal, setShowQuickPrintModal] = useState(false);

  const desc = description || subtitle;
  const activeTabItem = tabs?.find((t) => t.id === activeTab);

  // Helper to extract a display title string for printable sheet
  const getTitleString = (): string => {
    if (typeof title === 'string') return title;
    return 'Laporan Ringkasan Modul';
  };

  const getSubtitleString = (): string | undefined => {
    if (typeof desc === 'string') return desc;
    return undefined;
  };

  const renderIconElement = (
    item: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode | undefined,
    cls: string
  ) => {
    if (!item) return null;
    if (React.isValidElement(item)) {
      return item;
    }
    if (
      typeof item === 'function' ||
      (typeof item === 'object' && item !== null && ('$$typeof' in item || 'render' in item))
    ) {
      const Component = item as React.ComponentType<{ className?: string }>;
      return <Component className={cls} />;
    }
    return null;
  };

  const renderBadge = (badge: HeaderBadge | React.ReactNode, index: number) => {
    if (React.isValidElement(badge)) {
      return <React.Fragment key={index}>{badge}</React.Fragment>;
    }
    if (typeof badge === 'object' && badge !== null && 'label' in badge) {
      const b = badge as HeaderBadge;
      const variantClass = badgeVariants[b.variant || 'gold'] || badgeVariants.gold;
      return (
        <span
          key={index}
          className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 border whitespace-nowrap shrink-0 ${variantClass}`}
        >
          {b.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
          {renderIconElement(b.icon, 'w-3.5 h-3.5')}
          <span>{b.label}</span>
        </span>
      );
    }
    return null;
  };

  // Extract plain text from ReactNode for tooltip labels
  const extractTextLabel = (node: React.ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node).trim();
    }
    if (Array.isArray(node)) {
      return node.map(extractTextLabel).filter(Boolean).join(' ').trim();
    }
    if (React.isValidElement(node)) {
      const props = node.props as { children?: React.ReactNode };
      return extractTextLabel(props.children);
    }
    return '';
  };

  // Extract the first icon element (non-span element) from button children
  const extractIconChild = (node: React.ReactNode): React.ReactNode => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = extractIconChild(child);
        if (found) return found;
      }
      return null;
    }
    if (React.isValidElement(node)) {
      if (node.type === React.Fragment) {
        const props = node.props as { children?: React.ReactNode };
        return extractIconChild(props.children);
      }
      if (node.type !== 'span') {
        const existingProps = node.props as { className?: string };
        const hasColor = existingProps.className && /text-/.test(existingProps.className);
        return React.cloneElement(node as React.ReactElement<{ className?: string }>, {
          className: `w-4 h-4 shrink-0 ${hasColor ? existingProps.className : ''}`
        });
      }
    }
    return null;
  };

  // Recursively convert any <button> elements inside `actions` into icon-only buttons with tooltips
  const renderIconOnlyActions = (node: React.ReactNode, keyPrefix = 'act'): React.ReactNode => {
    if (!node) return null;
    if (Array.isArray(node)) {
      return node.map((child, idx) => renderIconOnlyActions(child, `${keyPrefix}-${idx}`));
    }
    if (React.isValidElement(node)) {
      const elProps = node.props as Record<string, any>;
      if (node.type === React.Fragment || node.type === 'div') {
        // If it's a wrapper div that only wraps buttons, unwrap and convert its children
        if (node.type === 'div' && elProps.children) {
          const childArr = React.Children.toArray(elProps.children);
          const hasButtons = childArr.some(
            (c) => React.isValidElement(c) && (c.type === 'button' || c.type === React.Fragment)
          );
          if (hasButtons) {
            return childArr.map((child, idx) => renderIconOnlyActions(child, `${keyPrefix}-${idx}`));
          }
        }
        return React.Children.map(elProps.children, (child, idx) =>
          renderIconOnlyActions(child, `${keyPrefix}-${idx}`)
        );
      }
      if (node.type === 'button') {
        const tooltipText = elProps.title || elProps['aria-label'] || extractTextLabel(elProps.children) || 'Aksi';
        const iconEl = extractIconChild(elProps.children) || <Sliders className="w-4 h-4" />;
        const cls: string = elProps.className || '';
        const isPrimaryBrass =
          cls.includes('from-[#B8905A]') ||
          cls.includes('bg-[#B8905A]') ||
          cls.includes('from-amber');
        const isEmerald = cls.includes('from-emerald') || cls.includes('bg-emerald');
        const isRose = cls.includes('from-rose') || cls.includes('bg-rose');

        const buttonStyle = isPrimaryBrass
          ? 'bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:brightness-105 text-[#101A2C] shadow-2xs'
          : isEmerald
          ? 'bg-gradient-to-r from-emerald-700 to-teal-800 hover:brightness-110 text-white shadow-2xs'
          : isRose
          ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-2xs'
          : 'bg-[#101A2C]/90 hover:bg-[#101A2C] text-[#D9B98A] hover:text-[#FFFDF9] border border-[#B8905A]/40';

        return (
          <button
            key={node.key ?? keyPrefix}
            type={elProps.type || 'button'}
            onClick={elProps.onClick}
            disabled={elProps.disabled}
            title={tooltipText}
            aria-label={tooltipText}
            className={`group relative w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 shrink-0 ${buttonStyle}`}
          >
            {iconEl}
            <span className="pointer-events-none absolute -bottom-8 right-0 z-30 whitespace-nowrap rounded-md bg-[#101A2C] px-2 py-1 text-[11px] font-semibold text-[#FFFDF9] shadow-md border border-[#B8905A]/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {tooltipText}
            </span>
          </button>
        );
      }
    }
    return node;
  };

  const quickPrintButton = enableQuickPrint ? (
    <button
      type="button"
      onClick={() => setShowQuickPrintModal(true)}
      title="Quick Print"
      aria-label="Quick Print"
      className="group relative w-8 h-8 rounded-lg bg-[#101A2C]/90 hover:bg-[#101A2C] text-[#D9B98A] hover:text-[#FFFDF9] border border-[#B8905A]/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
    >
      <Printer className="w-4 h-4 text-[#B8905A] group-hover:text-[#FFFDF9] transition-colors" />
      <span className="pointer-events-none absolute -bottom-8 right-0 z-30 whitespace-nowrap rounded-md bg-[#101A2C] px-2 py-1 text-[11px] font-semibold text-[#FFFDF9] shadow-md border border-[#B8905A]/40 opacity-0 group-hover:opacity-100 transition-opacity">
        Quick Print
      </span>
    </button>
  ) : null;

  return (
    <>
      <div
        className={`rounded-xl border border-[#E1D6BE] bg-[#FFFDF9] shadow-xs ${className}`}
      >
        {/* Top Bar: Navigation Tabs / Compact Stats Strip + Icon-Only Action Buttons with Tooltips */}
        <div
          className={`px-3 sm:px-4 py-2.5 bg-gradient-to-r from-[#1B2A45] via-[#16233B] to-[#101A2C] text-[#FFFDF9] flex items-center justify-between gap-3 ${
            children ? 'rounded-t-xl border-b border-[#B8905A]/30' : 'rounded-xl'
          }`}
        >
          {/* Left Strip: Tabs, Stats, or Compact Context Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-navy min-w-0 flex-1 pb-1">
            {tabs && tabs.length > 0 ? (
              tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange && onTabChange(tab.id)}
                    title={tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#B8905A] text-[#101A2C] font-bold shadow-2xs'
                        : 'text-[#EDE6D6]/80 hover:bg-[#1B2A45] hover:text-[#FFFDF9]'
                    }`}
                  >
                    {renderIconElement(tab.icon, 'w-3.5 h-3.5 shrink-0')}
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-[#101A2C]/80 font-bold' : 'text-[#D9B98A]/80'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                    {tab.badge && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase ${
                          tab.badgeVariant === 'rose'
                            ? 'bg-rose-500/30 text-rose-300 animate-pulse'
                            : 'bg-[#B8905A]/30 text-[#D9B98A]'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })
            ) : stats && stats.length > 0 ? (
              stats.map((st, i) => {
                const style = statVariants[st.variant || 'default'] || statVariants.default;
                return (
                  <div
                    key={i}
                    className={`px-3 py-1 rounded-lg border flex items-center gap-2 whitespace-nowrap shrink-0 ${style.bg}`}
                  >
                    <span className="text-[10px] text-[#EDE6D6]/75 uppercase font-semibold">{st.label}</span>
                    <span className={`text-xs font-black font-mono tabular-nums ${style.text}`}>{st.value}</span>
                  </div>
                );
              })
            ) : badges && badges.length > 0 ? (
              badges.map((badge, idx) => renderBadge(badge, idx))
            ) : null}
          </div>

          {/* Right Strip: Icon-Only Action Buttons with Tooltips */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-[#B8905A]/25">
            {quickPrintButton}
            {renderIconOnlyActions(actions)}
          </div>
        </div>

        {/* Optional Nested Toolbar / Filter Content */}
        {children && (
          <div className="p-3 sm:px-4 bg-[#101A2C]/95 rounded-b-xl text-[#FFFDF9]">
            {children}
          </div>
        )}
      </div>

      {/* Quick Print Config Modal */}
      <QuickPrintConfigModal
        isOpen={showQuickPrintModal}
        onClose={() => setShowQuickPrintModal(false)}
        moduleTitle={getTitleString()}
        moduleSubtitle={getSubtitleString()}
        badges={badges}
        stats={stats}
        activeTabLabel={activeTabItem?.label}
        quickPrintData={quickPrintData}
      />
    </>
  );
};


