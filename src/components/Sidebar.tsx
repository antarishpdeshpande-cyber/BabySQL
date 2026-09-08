import React, { useState } from 'react';
import { Table, Search, ChevronRight, ChevronDown, Play, BarChart2, Trash2, Key, Layers } from 'lucide-react';
import { TableMeta } from '../types';

interface SidebarProps {
  tables: TableMeta[];
  onSelectTableQuery: (tableName: string) => void;
  onProfileTable: (tableName: string) => void;
  onDropTable: (tableName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tables,
  onSelectTableQuery,
  onProfileTable,
  onDropTable,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-64 border-r border-border bg-surface/50 flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Tables & Schema
          </span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-surface-raised text-slate-400 border border-border">
            {tables.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Filter tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 bg-background border border-border rounded text-xs text-slate-200 placeholder:text-muted focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredTables.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-muted">
            {tables.length === 0
              ? 'No tables in database. Ingest a CSV or click "Sample Data".'
              : 'No matching tables found.'}
          </div>
        ) : (
          filteredTables.map((table) => {
            const isExpanded = !!expandedTables[table.name];
            return (
              <div
                key={table.name}
                className="rounded border border-transparent hover:border-border/60 bg-surface/30 transition-all overflow-hidden"
              >
                {/* Table Header Row */}
                <div
                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-surface-raised/60 group"
                  onClick={() => toggleTable(table.name)}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-muted">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <Table className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-200 truncate group-hover:text-white" title={table.name}>
                      {table.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTableQuery(table.name);
                      }}
                      className="p-1 rounded hover:bg-primary/20 hover:text-primary text-muted transition-all"
                      title="SELECT * FROM table"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProfileTable(table.name);
                      }}
                      className="p-1 rounded hover:bg-cyan-500/20 hover:text-cyan-400 text-muted transition-all"
                      title="Statistical Profiling"
                    >
                      <BarChart2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDropTable(table.name);
                      }}
                      className="p-1 rounded hover:bg-danger/20 hover:text-danger text-muted transition-all"
                      title="Drop Table"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-muted group-hover:hidden ml-1 flex-shrink-0">
                    {table.rowCount.toLocaleString()} r
                  </span>
                </div>

                {/* Expanded Column Info */}
                {isExpanded && (
                  <div className="bg-background/50 border-t border-border/40 px-3 py-1.5 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-muted mb-1 font-mono">
                      <span>{table.columns.length} columns</span>
                      <span>{table.rowCount.toLocaleString()} rows</span>
                    </div>
                    {table.columns.map((col) => (
                      <div
                        key={col.cid}
                        className="flex items-center justify-between text-[11px] py-0.5 group/col"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {col.pk === 1 ? (
                            <span title="Primary Key">
                              <Key className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            </span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                          )}
                          <span className="text-slate-300 truncate" title={col.name}>
                            {col.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-surface-raised text-muted border border-border/50">
                          {col.type || 'TEXT'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
