import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameSettings } from '../types/generated';
import type { UISettings } from '../types';

const SETTINGS_KEY = 'sudokucalm-settings';

function loadSettings(): { game: GameSettings; ui: UISettings } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    game: {
      show_timer: true,
      show_hints: true,
      highlight_areas: true,
      highlight_numbers: true,
    },
    ui: {
      sound: false,
      haptics: false,
    },
  };
}

function saveSettings(settings: { game: GameSettings; ui: UISettings }) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between py-3 cursor-pointer">
      <div>
        <div className="text-sm font-medium text-ink-dark">{label}</div>
        {description && <div className="text-xs text-ink-mid mt-0.5">{description}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-200
          ${checked ? 'bg-primary' : 'bg-gray-200'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 rounded-full bg-white shadow-sm
            transform transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-ink-mid uppercase tracking-wider mb-1">{title}</h3>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateGame = (key: keyof GameSettings, value: boolean) => {
    setSettings((s) => ({
      ...s,
      game: { ...s.game, [key]: value },
    }));
  };

  const updateUI = (key: keyof UISettings, value: boolean) => {
    setSettings((s) => ({
      ...s,
      ui: { ...s.ui, [key]: value },
    }));
  };

  return (
    <div className="min-h-screen bg-white max-w-[500px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-ink-dark">设置</h2>
      </div>

      {/* Game Settings */}
      <Section title="游戏设置">
        <Toggle
          label="显示计时器"
          description="在状态栏显示游戏用时"
          checked={settings.game.show_timer}
          onChange={(v) => updateGame('show_timer', v)}
        />
        <Toggle
          label="显示提示解释"
          description="使用提示时展示逻辑推理过程"
          checked={settings.game.show_hints}
          onChange={(v) => updateGame('show_hints', v)}
        />
        <Toggle
          label="高亮关联区域"
          description="选中单元格时高亮所在行、列和九宫格"
          checked={settings.game.highlight_areas}
          onChange={(v) => updateGame('highlight_areas', v)}
        />
        <Toggle
          label="高亮相同数字"
          description="高亮全盘相同数字的单元格"
          checked={settings.game.highlight_numbers}
          onChange={(v) => updateGame('highlight_numbers', v)}
        />
      </Section>

      {/* UI Settings */}
      <Section title="界面设置">
        <Toggle
          label="音效"
          description="操作时播放音效反馈"
          checked={settings.ui.sound}
          onChange={(v) => updateUI('sound', v)}
        />
        <Toggle
          label="震动反馈"
          description="操作时触发设备震动"
          checked={settings.ui.haptics}
          onChange={(v) => updateUI('haptics', v)}
        />
      </Section>

      {/* About */}
      <div className="mt-10 pt-4 border-t border-border">
        <p className="text-xs text-ink-mid text-center">
          Sudoku Calm v0.1.0 · Built with React + Rust WASM
        </p>
      </div>
    </div>
  );
}
