import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export const SettingsPage: React.FC = () => {
  const { user, updateGroqApiKey } = useAuthStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'cleared' | 'error'>('idle');

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedKey = apiKeyInput.trim();
    setStatus('saving');
    try {
      const hasKey = await updateGroqApiKey(trimmedKey);
      setApiKeyInput('');
      setStatus(hasKey ? 'saved' : 'idle');
    } catch (error) {
      setStatus('error');
    }
  };

  const handleClear = async () => {
    setStatus('saving');
    try {
      await updateGroqApiKey('');
      setApiKeyInput('');
      setStatus('cleared');
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-600 mb-6">
        Your API key applies to all your workspaces.
      </p>

      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Groq API key</h2>
          <p className="text-sm text-gray-600">
            This key lets AI understand requests and generate the brief.
          </p>
        </div>

        <div className="rounded-md border border-secondary-200 bg-secondary-50 p-3 text-sm text-gray-600 space-y-1">
          <p>Quick steps:</p>
          <p>
            1. Go to{' '}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-primary-700 hover:text-primary-800 underline"
            >
              console.groq.com/keys
            </a>
          </p>
          <p>2. Create an API key</p>
          <p>3. Paste it here and save</p>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Status</span>
            <span>{user?.hasGroqApiKey ? 'Saved' : 'Not set'}</span>
          </div>

          {user?.hasGroqApiKey ? (
            <div className="rounded-lg border border-secondary-200 bg-white p-3">
              <div className="text-sm text-gray-500 mb-1">Current key</div>
              <div className="text-base font-medium text-gray-900">
                {(user?.groqApiKeyPrefix || '____') + '•••' + (user?.groqApiKeyLast4 || '____')}
              </div>
            </div>
          ) : (
            <input
              type="password"
              value={apiKeyInput}
              onChange={(event) => {
                setApiKeyInput(event.target.value);
                setStatus('idle');
              }}
              className="input"
              placeholder="Paste your Groq API key"
            />
          )}

          <div className="flex items-center gap-2">
            {!user?.hasGroqApiKey && (
              <button type="submit" className="btn btn-primary" disabled={status === 'saving'}>
                {status === 'saving' ? 'Saving...' : 'Save'}
              </button>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="btn btn-secondary"
              disabled={status === 'saving' || !user?.hasGroqApiKey}
            >
              Clear key
            </button>
          </div>
          {status === 'error' && (
            <p className="text-sm text-red-600">Could not save the API key.</p>
          )}
          {status === 'saved' && (
            <p className="text-sm text-green-600">API key saved.</p>
          )}
          {status === 'cleared' && (
            <p className="text-sm text-green-600">API key cleared.</p>
          )}
        </form>
      </div>
    </div>
  );
};
