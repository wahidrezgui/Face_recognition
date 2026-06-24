"use client";

import { Button } from "@/components/ui/button";
import { inputCls, labelCls } from "./gate-form-styles";

interface GateSettingsFormProps {
  editName: string;
  editPythonUrl: string;
  editApiKey: string;
  editStartCommand: string;
  editSaving: boolean;
  editError: string;
  onNameChange: (v: string) => void;
  onPythonUrlChange: (v: string) => void;
  onApiKeyChange: (v: string) => void;
  onStartCommandChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function GateSettingsForm({
  editName,
  editPythonUrl,
  editApiKey,
  editStartCommand,
  editSaving,
  editError,
  onNameChange,
  onPythonUrlChange,
  onApiKeyChange,
  onStartCommandChange,
  onSubmit,
}: GateSettingsFormProps) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-bold tracking-wide">Gate Settings</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Display Name</label>
            <input className={inputCls} value={editName} onChange={(e) => onNameChange(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Python Service URL</label>
            <input className={inputCls} value={editPythonUrl} onChange={(e) => onPythonUrlChange(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>New API Key</label>
            <input
              type="password"
              className={inputCls}
              placeholder="Leave blank to keep current"
              value={editApiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Start Command</label>
            <input
              className={inputCls}
              placeholder="bash /path/to/run-gate.sh"
              value={editStartCommand}
              onChange={(e) => onStartCommandChange(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-gray-600">Leave blank to clear.</p>
          </div>
        </div>
        {editError && <p className="text-xs text-red-400">{editError}</p>}
        <Button type="submit" disabled={editSaving} variant="outline" size="sm">
          {editSaving ? "Saving…" : "Save Settings"}
        </Button>
      </form>
    </section>
  );
}
