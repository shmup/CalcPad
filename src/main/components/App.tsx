import * as React from 'react';
import { useEffect, useState } from 'react';
import { Store } from '../store';
import '../styles/app.less';
import * as darkTheme from './DarkTheme';
import { Editor } from './Editor';
import { Help } from './Help';
import * as lightTheme from './LightTheme';
import { Preferences, PreferencesDialog } from './PreferencesDialog';

const { ipcRenderer } = window.require('electron');

export const App = ({ store }: { store: Store }) => {
  const [value, setValue] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [preferences, setPreferences] = useState(store.preferences());

  useEffect(() => {
    // sent by the menus
    ipcRenderer.on('new-file', () => newFile());
    ipcRenderer.on('save-file', () => showSaveDialog());
    ipcRenderer.on('open-file', () => showOpenDialog());
    ipcRenderer.on('open-preferences', () => setShowPreferences(true));
    ipcRenderer.on('open-help', () => setShowHelp(true));

    window.onkeyup = e => {
      if (e.key === 'Escape') {
        setShowPreferences(false);
        setShowHelp(false);
      }
    };

    store.getLastFileContent().then(value => {
      setValue(value);
    });

    configureCSSVars(preferences);

    setTitle();
  }, []);

  const newFile = () => {
    store.newFile();
    setValue('');
  };

  const closePreferencesDialog = () => setShowPreferences(false);
  const closeHelp = () => setShowHelp(false);

  const savePreferences = (preferences: Preferences) => {
    setPreferences(preferences);
    configureCSSVars(preferences);
    store.savePreferences(preferences);
  };

  const setTitle = () => {
    const title = store.isTempFile()
      ? 'CalcPad'
      : 'CalcPad - ' + store.getLastFile();

    ipcRenderer.invoke('setWindowTitle', title);
  };

  const showSaveDialog = () => {
    // we already save on change
    if (!store.isTempFile()) return;

    ipcRenderer.invoke('dialog', 'showSaveDialog', {
      title: 'Save'
    }).then((result: any) => {
      const file = result.filePath;
      file && store.saveFile(file, value);
    });
  };

  const showOpenDialog = () => {
    ipcRenderer.invoke('dialog', 'showOpenDialog', {
      title: 'Open',
      properties: ['openFile'],
    }).then(async (result: any) => {
      const files = result.filePaths;
      if (!files || files.length === 0) return; // user cancelled

      const contents = await store.open(files[0]);

      setValue(contents);
      setTitle();
    });
  };

  return <div className="app">
    {!showHelp && <Editor
      store={store}
      value={value}
      preferences={preferences} />}
    {showPreferences && <PreferencesDialog
      preferences={store.preferences()}
      close={() => closePreferencesDialog()}
      save={(preferences: Preferences) => savePreferences(preferences)}
    />}
    {showHelp && <Help close={() => closeHelp()} />}
  </div>;
};

function configureCSSVars(preferences: Preferences): void {
  if (document.documentElement) {
    const style = document.documentElement.style;
    style.setProperty('--font-size', preferences.fontSize + 'px');

    const isDark = preferences.theme === 'dark';
    const colors = isDark ? darkTheme.colors : lightTheme.colors;

    style.setProperty('--text-color', isDark
      ? colors.light
      : colors.medium);

    style.setProperty('--dialog-bg-color', isDark
      ? colors.background
      : colors.darkBackground);
  }
}
