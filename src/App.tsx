/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Filesystem, Directory, ReaddirResult } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { 
  Folder, 
  File, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Search,
  HardDrive,
  Music,
  AlertCircle,
  CheckCircle2,
  Info,
  Settings,
  ShieldCheck,
  Layers,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileItem } from './types';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasFullAccess, setHasFullAccess] = useState<boolean | null>(null);

  const checkPermissions = useCallback(async () => {
    try {
      await Filesystem.readdir({
        path: '',
        directory: Directory.External,
      });
      setHasFullAccess(true);
      setError(null);
    } catch (err: any) {
      setHasFullAccess(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await checkPermissions();
      loadDirectory('');
    };
    init();
  }, [checkPermissions]);

  const requestFullAccess = async () => {
    try {
      setError('אנא אשר "גישה לניהול כל הקבצים" בהגדרות.');
      window.open('package:' + 'com.hebrew.namefixer.pro', '_system');
      setTimeout(checkPermissions, 5000);
    } catch (err) {
      setError('לא ניתן לפתוח את ההגדרות באופן אוטומטי.');
    }
  };

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const result: ReaddirResult = await Filesystem.readdir({
        path: path,
        directory: Directory.External,
      });

      const mappedFiles: FileItem[] = result.files.map(f => ({
        name: f.name,
        path: path ? `${path}/${f.name}` : f.name,
        type: f.type === 'directory' ? 'directory' : 'file',
      }));

      mappedFiles.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });

      setFiles(mappedFiles);
      setCurrentPath(path);
      setHasFullAccess(true);
    } catch (err: any) {
      if (err.message?.includes('Permission') || err.message?.includes('access')) {
        setHasFullAccess(false);
      } else {
        setError('שגיאה בטעינת הקבצים.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const navigateTo = (path: string) => {
    setHistory(prev => [...prev, currentPath]);
    loadDirectory(path);
  };

  const goBack = () => {
    if (history.length > 0) {
      const last = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      loadDirectory(last);
    } else if (currentPath.includes('/')) {
      const parent = currentPath.split('/').slice(0, -1).join('/');
      loadDirectory(parent);
    } else if (currentPath !== '') {
      loadDirectory('');
    }
  };

  /**
   * Smart Hebrew Reversal:
   * Reverses only Hebrew segments. Keeps English and Numbers in their original order.
   * Example: "01 שיר אהבה Song" -> "01 הבהא ריש Song"
   */
  const reverseHebrewSmart = (text: string): string => {
    const hebrewRegex = /[\u0590-\u05FF]+|[^/u0590-\u05FF]+/g;
    const parts = text.match(hebrewRegex);
    if (!parts) return text;

    return parts.map(part => {
      // If this part contains Hebrew characters, reverse it
      if (/[\u0590-\u05FF]/.test(part)) {
        return part.split('').reverse().join('');
      }
      // Otherwise (English, Numbers, Symbols), keep as is
      return part;
    }).join('');
  };

  const fixFileName = async (file: FileItem) => {
    const newName = reverseHebrewSmart(file.name);
    if (newName === file.name) return;

    try {
      const parentPath = currentPath;
      await Filesystem.rename({
        from: file.path,
        to: parentPath ? `${parentPath}/${newName}` : newName,
        directory: Directory.External
      });
      
      setSuccessMessage(`הקובץ "${file.name}" שונה בהצלחה`);
      setTimeout(() => setSuccessMessage(null), 3000);
      loadDirectory(currentPath);
    } catch (err) {
      setError('שגיאה בשינוי שם הקובץ.');
    }
  };

  // Recursive function to fix all files in a tree
  const processDirectoryRecursive = async (path: string) => {
    let count = 0;
    try {
      const result = await Filesystem.readdir({
        path: path,
        directory: Directory.External,
      });

      for (const f of result.files) {
        const fullPath = path ? `${path}/${f.name}` : f.name;
        
        if (f.type === 'directory') {
          // Recursive call for subdirectories
          count += await processDirectoryRecursive(fullPath);
        } else {
          // Process file
          const newName = reverseHebrewSmart(f.name);
          if (newName !== f.name) {
            await Filesystem.rename({
              from: fullPath,
              to: path ? `${path}/${newName}` : newName,
              directory: Directory.External
            });
            count++;
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }
        }
      }
    } catch (err) {
      console.error('Error in recursive processing:', err);
    }
    return count;
  };

  const fixRecursive = async () => {
    setProcessing(true);
    setError(null);
    setProgress({ current: 0, total: 0 });
    
    try {
      const totalFixed = await processDirectoryRecursive(currentPath);
      setSuccessMessage(`הושלם! תוקנו ${totalFixed} קבצים בכל עץ התיקיות.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadDirectory(currentPath);
    } catch (err) {
      setError('שגיאה במהלך תיקון עץ התיקיות.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold flex items-center gap-2 text-blue-600">
              <Music className="w-6 h-6" />
              מתקן שמות בעברית PRO
            </h1>
            <p className="text-[10px] text-rose-500 font-bold mr-8 flex items-center gap-1 animate-pulse">
              מוקדש ליאיר האהוב ❤️
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={checkPermissions}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <ShieldCheck className={`w-5 h-5 ${hasFullAccess ? 'text-emerald-500' : 'text-red-400'}`} />
            </button>
            <button 
              onClick={goBack}
              disabled={currentPath === '' && history.length === 0 || processing}
              className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center bg-slate-100 rounded-xl px-3 py-2">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="חיפוש בתיקייה..."
            className="bg-transparent border-none outline-none w-full text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={processing}
          />
        </div>
      </header>

      {/* Processing Overlay */}
      <AnimatePresence>
        {processing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
          >
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold mb-2">מתקן קבצים בעומק התיקיות...</h2>
            <p className="text-slate-500 mb-4 text-sm">נא לא לסגור את האפליקציה. זה עשוי לקחת זמן בתיקיות גדולות.</p>
            <div className="w-full max-w-xs bg-slate-200 h-2 rounded-full overflow-hidden">
              <motion.div 
                className="bg-blue-600 h-full"
                animate={{ width: '100%' }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <p className="mt-2 text-blue-600 font-mono font-bold">{progress.current} קבצים תוקנו</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Warning */}
      {hasFullAccess === false && (
        <div className="bg-orange-50 border-b border-orange-100 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3 text-orange-700 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>חסרה הרשאת "גישה לכל הקבצים".</p>
          </div>
          <button 
            onClick={requestFullAccess}
            className="bg-orange-600 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 self-start"
          >
            <Settings className="w-4 h-4" />
            פתח הגדרות הרשאה
          </button>
        </div>
      )}

      {/* Path Breadcrumbs */}
      <div className="bg-white border-b border-slate-100 p-2 overflow-x-auto whitespace-nowrap custom-scrollbar">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <HardDrive className="w-3 h-3" />
          <span onClick={() => loadDirectory('')} className="hover:text-blue-600 cursor-pointer">אחסון פנימי</span>
          {currentPath.split('/').filter(Boolean).map((part, i, arr) => (
            <React.Fragment key={i}>
              <ChevronLeft className="w-3 h-3" />
              <span 
                onClick={() => loadDirectory(arr.slice(0, i + 1).join('/'))}
                className="hover:text-blue-600 cursor-pointer"
              >
                {part}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl mb-4 flex items-center gap-2 text-sm"
            >
              <AlertCircle className="w-5 h-5" />
              {error}
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-xl mb-4 flex items-center gap-2 text-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">סורק קבצים...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
            <Folder className="w-12 h-12 opacity-20" />
            <p>{hasFullAccess === false ? 'חסרה הרשאה לצפייה בקבצים' : 'תיקייה ריקה'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {filteredFiles.map((file) => (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 transition-all group"
              >
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer overflow-hidden"
                  onClick={() => file.type === 'directory' ? navigateTo(file.path) : null}
                >
                  {file.type === 'directory' ? (
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                      <Folder className="w-5 h-5 fill-current" />
                    </div>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                      <File className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    {file.type === 'file' && (
                      <span className="text-[10px] text-slate-400" dir="ltr">
                        {reverseHebrewSmart(file.name)}
                      </span>
                    )}
                  </div>
                </div>

                {file.type === 'file' && (
                  <button 
                    onClick={() => fixFileName(file)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                    title="הפוך שם קובץ"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Actions */}
      {!loading && (
        <footer className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] grid grid-cols-2 gap-3">
          <button 
            onClick={() => {
              const filesToFix = files.filter(f => f.type === 'file');
              if (filesToFix.length === 0) return;
              fixRecursive(); // In this context, we can just use the recursive one on current folder
            }}
            disabled={!hasFullAccess || processing}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-[10px]"
          >
            <RotateCcw className="w-4 h-4" />
            תיקייה נוכחית
          </button>
          
          <button 
            onClick={fixRecursive}
            disabled={!hasFullAccess || processing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg shadow-blue-200 text-[10px]"
          >
            <Layers className="w-4 h-4" />
            כל עץ התיקיות
          </button>
        </footer>
      )}
    </div>
  );
}
