import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ingestCsvString, sanitizeIdentifier } from '../lib/csvParser';
import Papa from 'papaparse';

interface CsvUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (tableName: string) => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ isOpen, onClose, onIngestSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [tableName, setTableName] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    const suggestedName = sanitizeIdentifier(selectedFile.name.replace(/\.[^/.]+$/, ''));
    setTableName(suggestedName);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);

      Papa.parse(text, {
        header: true,
        preview: 5,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setPreviewHeaders(results.meta.fields);
          }
          if (results.data) {
            setPreviewRows(results.data);
          }
        },
        error: (err: any) => {
          setError(err.message);
        },
      });
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleIngest = async () => {
    if (!csvContent) {
      setError('Please select a valid CSV file.');
      return;
    }
    const cleanName = sanitizeIdentifier(tableName);
    if (!cleanName) {
      setError('Please provide a valid table name.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await ingestCsvString(csvContent, { tableName: cleanName });
      setIsProcessing(false);
      onIngestSuccess(res.tableName);
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-sm text-slate-100">Ingest CSV to SQLite</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-raised text-muted hover:text-slate-200 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border/80 bg-background/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
                accept=".csv,.tsv,.txt"
                className="hidden"
              />
              <FileText className="w-10 h-10 text-cyan-400/80 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">Drag & drop your CSV file here</p>
              <p className="text-[11px] text-muted mt-1">or click to browse local files (.csv, .tsv)</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-background border border-border rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-slate-200 truncate">{file.name}</span>
                  <span className="text-[10px] text-muted font-mono">
                    ({Math.round(file.size / 1024)} KB)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setCsvContent('');
                    setPreviewRows([]);
                    setPreviewHeaders([]);
                  }}
                  className="text-[11px] text-muted hover:text-danger"
                >
                  Change file
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  SQLite Table Name:
                </label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="e.g. sales_data"
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary"
                />
              </div>

              {previewRows.length > 0 && (
                <div>
                  <div className="flex justify-between items-center text-[11px] text-muted mb-1.5">
                    <span>Preview (first 5 rows, {previewHeaders.length} columns)</span>
                  </div>
                  <div className="overflow-x-auto border border-border rounded bg-background max-h-48 text-[11px] font-mono">
                    <table className="w-full border-collapse">
                      <thead className="bg-surface-raised border-b border-border text-slate-300">
                        <tr>
                          {previewHeaders.map((h) => (
                            <th key={h} className="p-1.5 text-left border-r border-border/40 font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {previewRows.map((row, i) => (
                          <tr key={i} className="hover:bg-surface-raised/40">
                            {previewHeaders.map((h) => (
                              <td key={h} className="p-1.5 border-r border-border/40 truncate max-w-[150px] text-slate-300">
                                {String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-danger/10 border border-danger/30 rounded text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2 bg-surface-raised/40">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-muted hover:text-slate-200 hover:bg-surface-raised transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleIngest}
            disabled={!file || isProcessing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all active:scale-95 disabled:opacity-40"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Ingesting Table...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Ingest Table</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
