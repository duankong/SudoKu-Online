import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../hooks/useGameEngine';
import { Clock, Lightbulb, Layers, Hash, ArrowLeft } from 'lucide-react';
import type { GameSettings as GameSettingsType } from '../types/generated';

const SETTINGS_KEY = 'sudokucalm-settings';

function loadSettings(): GameSettingsType {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.game) return parsed.game;
    }
  } catch { /* ignore */ }
  return { show_timer: true, show_hints: true, highlight_areas: true, highlight_numbers: true };
}

function saveSettings(settings: GameSettingsType) {
  try {
    const existing = localStorage.getItem(SETTINGS_KEY);
    const data = existing ? JSON.parse(existing) : {};
    data.game = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

const TOGGLES: {
  key: keyof GameSettingsType;
  icon: React.ReactNode;
  labelKey: string;
  descKey: string;
}[] = [
  { key: 'show_timer', icon: <Clock size={20} />, labelKey: 'gameSettings.showTimer', descKey: 'gameSettings.showTimer_desc' },
  { key: 'show_hints', icon: <Lightbulb size={20} />, labelKey: 'gameSettings.showHints', descKey: 'gameSettings.showHints_desc' },
  { key: 'highlight_areas', icon: <Layers size={20} />, labelKey: 'gameSettings.highlightAreas', descKey: 'gameSettings.highlightAreas_desc' },
  { key: 'highlight_numbers', icon: <Hash size={20} />, labelKey: 'gameSettings.highlightNumbers', descKey: 'gameSettings.highlightNumbers_desc' },
];

export function GameSettings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [settings, setSettingsState] = useState(loadSettings);

  // We need to dispatch to WASM so highlights update immediately
  const engine = useGameEngine();

  const updateSetting = (key: keyof GameSettingsType, value: boolean) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      // Dispatch to WASM if engine is ready
      engine.dispatch?.({ type: 'updateGameSettings', settings: next });
      return next;
    });
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
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-ink-dark">{t('gameSettings.title')}</h2>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        {TOGGLES.map(({ key, icon, labelKey, descKey }) => (
          <label
            key={key}
            className="flex items-center justify-between py-4 px-4 rounded-xl bg-bg-board cursor-pointer
                       hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-primary">{icon}</span>
              <div>
                <div className="text-sm font-medium text-ink-dark">{t(labelKey)}</div>
                <div className="text-xs text-ink-mid mt-0.5">{t(descKey)}</div>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={settings[key]}
              onClick={() => updateSetting(key, !settings[key])}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-200 flex-shrink-0
                ${settings[key] ? 'bg-primary' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white shadow-sm
                  transform transition-transform duration-200
                  ${settings[key] ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
