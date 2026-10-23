import React from "react";
import type { Viewer360Settings } from "./Viewer360";

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" />
      <span className="toggle-thumb" />
    </label>
  );
}

export function SequenceSettingsPanel({
  frameCount,
  settings,
  onChange,
}: {
  frameCount: number;
  settings: Viewer360Settings;
  onChange: (next: Viewer360Settings) => void;
}) {
  return (
    <div className="card card-padded">
      <h2 style={{ marginBottom: 12 }}>360 Settings</h2>

      <div className="settings-row">
        <div>
          <div className="settings-row-label">Frame count</div>
        </div>
        <div>{frameCount}</div>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-row-label">Auto rotate</div>
          <div className="settings-row-desc">Roda automaticamente quando ninguém interage.</div>
        </div>
        <Toggle checked={settings.autoRotate} onChange={(v) => onChange({ ...settings, autoRotate: v })} />
      </div>

      <div className="settings-row">
        <div className="settings-row-label">Speed</div>
        <div className="segmented">
          {(["slow", "normal", "fast"] as const).map((speed) => (
            <button
              key={speed}
              type="button"
              className={settings.rotateSpeed === speed ? "active" : ""}
              onClick={() => onChange({ ...settings, rotateSpeed: speed })}
            >
              {speed === "slow" ? "Slow" : speed === "normal" ? "Normal" : "Fast"}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row-label">Zoom</div>
        <Toggle checked={settings.zoomEnabled} onChange={(v) => onChange({ ...settings, zoomEnabled: v })} />
      </div>

      <div className="settings-row">
        <div className="settings-row-label">Fullscreen</div>
        <Toggle checked={settings.fullscreenEnabled} onChange={(v) => onChange({ ...settings, fullscreenEnabled: v })} />
      </div>

      <div className="settings-row">
        <div className="settings-row-label">Controls</div>
        <Toggle checked={settings.controlsEnabled} onChange={(v) => onChange({ ...settings, controlsEnabled: v })} />
      </div>

      <div className="settings-row">
        <div className="settings-row-label">Background</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["#ffffff", "#f2f2f2", "#16171a"].map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ ...settings, background: color })}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: color,
                border: settings.background === color ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                cursor: "pointer",
              }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
