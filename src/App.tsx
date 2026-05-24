import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, XCircle, AlertTriangle, FileJson, FileSpreadsheet, RefreshCcw, Menu, X, Activity } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'review' | 'ingest'>('review');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: number, action: 'APPROVED' | 'REJECTED') => {
    await fetch(`/api/review/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    fetchData();
  };

  const handleReset = async () => {
    await fetch('/api/admin/reset', { method: 'POST' });
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-zinc-900 flex overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-[#09090B] text-zinc-400 flex flex-col pt-8 pb-4 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shadow-2xl lg:shadow-none border-r border-white/5",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold tracking-tight flex items-center gap-2 text-white">
              <span className="h-6 w-6 rounded-md bg-emerald-500 inline-block shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"></span>
              Breathe ESG
            </h1>
            <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest pl-8">Analyst Portal</p>
          </div>
          <button className="lg:hidden p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5">
          <button 
            onClick={() => setActiveTab('review')}
            className={cn(
              "w-full flex items-center justify-start px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200", 
              activeTab === 'review' ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            )}
          >
            <CheckCircle2 className={cn("w-4 h-4 mr-3", activeTab === 'review' ? "text-emerald-400" : "")} />
            Review Queue
            {data.filter(d => d.status === 'PENDING_REVIEW').length > 0 && (
              <span className="ml-auto bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-md font-mono">
                {data.filter(d => d.status === 'PENDING_REVIEW').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('ingest')}
            className={cn(
              "w-full flex items-center justify-start px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200", 
              activeTab === 'ingest' ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            )}
          >
            <UploadCloud className={cn("w-4 h-4 mr-3", activeTab === 'ingest' ? "text-blue-400" : "")} />
            Ingest Data
          </button>
        </nav>

        <div className="px-4 mt-auto">
          <button onClick={handleReset} className="w-full flex items-center justify-start px-4 py-3 rounded-xl text-xs font-medium text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
            <RefreshCcw className="w-4 h-4 mr-3" />
            Reset Database
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-zinc-200/60 bg-white/60 backdrop-blur-xl flex items-center px-4 lg:px-8 shrink-0 sticky top-0 z-30">
          <button className="lg:hidden p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg mr-4 transition-colors" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-display font-medium text-zinc-900 tracking-tight">{activeTab === 'review' ? 'Pending Disclosures' : 'Workspace Data Ingestion'}</h2>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <div className="hidden sm:flex items-center text-zinc-500 font-medium">Tenant <span className="ml-2 font-mono text-[11px] bg-zinc-100/80 text-zinc-600 px-2.5 py-1 rounded-md border border-zinc-200 shadow-sm leading-none">Acme Corp</span></div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-display font-bold shadow-sm ring-2 ring-white">A</div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8 w-full">
          {activeTab === 'review' && (
             <ReviewDashboard data={data} handleAction={handleAction} loading={loading} />
          )}
          {activeTab === 'ingest' && (
             <IngestionPanel onComplete={fetchData} />
          )}
        </main>
      </div>
    </div>
  );
}

function ReviewDashboard({ data, handleAction, loading }: { data: any[], handleAction: any, loading: boolean }) {
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-sm text-zinc-500 font-mono flex items-center bg-white px-5 py-2.5 rounded-full border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <RefreshCcw className="w-4 h-4 mr-3 animate-spin text-zinc-400" />
        Synchronizing records...
      </div>
    </div>
  );

  const pending = data.filter(d => d.status === 'PENDING_REVIEW');
  const processed = data.filter(d => d.status !== 'PENDING_REVIEW');

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-12 w-full">
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h3 className="text-xl font-display font-semibold text-zinc-900 flex items-center tracking-tight">
            Requires Approval
            {pending.length > 0 && <span className="ml-3 bg-rose-50 text-rose-600 text-[11px] px-2.5 py-1 rounded-full font-semibold border border-rose-200/50 shadow-sm uppercase tracking-wider">{pending.length} pending</span>}
          </h3>
        </div>
        
        {pending.length === 0 ? (
          <div className="bg-white border border-dashed border-zinc-300 rounded-3xl p-16 text-center flex flex-col items-center justify-center text-zinc-500 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h4 className="text-xl font-display font-medium text-zinc-900 mb-2">Inbox Zero</h4>
            <p className="text-zinc-500 max-w-sm">All ingestion rows have been normalized and audited. The queue is empty.</p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200/80 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
                <thead className="bg-[#FBFBFB] border-b border-zinc-200/80 text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 text-[13px] font-medium tracking-wide">Source Tracking</th>
                    <th className="px-6 py-4 text-[13px] font-medium tracking-wide">Scope Category</th>
                    <th className="px-6 py-4 text-[13px] font-medium tracking-wide">Original Metric</th>
                    <th className="px-6 py-4 text-[13px] font-medium tracking-wide">Validation Status</th>
                    <th className="px-6 py-4 text-[13px] font-medium tracking-wide text-right sticky right-0 bg-[#FBFBFB] border-l border-transparent">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pending.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FCFCFC] transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                           <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/60 shadow-sm">
                             <Activity className="w-4 h-4 text-zinc-500" />
                           </div>
                           <div>
                             <div className="font-mono text-[11px] font-semibold text-zinc-800 tracking-wider uppercase">{row.source_type}</div>
                             <div className="text-[13px] text-zinc-500 truncate max-w-[180px] mt-0.5" title={row.original_filename}>{row.original_filename}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-medium text-zinc-900 mb-1">{row.scope}</div>
                        <div className="text-[11px] text-zinc-500 font-mono bg-zinc-100/80 px-2 py-0.5 rounded-md inline-block border border-zinc-200/50 uppercase tracking-widest">{row.activity_type.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-mono text-[15px] font-semibold text-zinc-900 border border-zinc-200/80 bg-white shadow-sm px-3 py-1.5 rounded-lg inline-flex items-baseline gap-1">
                           {row.original_value !== null ? row.original_value : '--'} 
                           <span className="text-zinc-400 font-sans text-xs font-medium ml-1.5">{row.original_unit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         {row.validation_errors.length > 0 ? (
                           <div className="flex flex-col gap-1.5 items-start">
                             {row.validation_errors.map((err: string, i: number) => (
                               <span key={i} className="inline-flex items-center text-xs font-medium text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100/80 w-fit whitespace-normal max-w-xs leading-relaxed shadow-sm">
                                 <AlertTriangle className="w-3.5 h-3.5 mr-2 shrink-0" />
                                 {err}
                               </span>
                             ))}
                           </div>
                         ) : (
                           <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100/80 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                              Valid Match
                           </span>
                         )}
                      </td>
                      <td className="px-6 py-5 text-right sticky right-0 bg-white group-hover:bg-[#FCFCFC] transition-colors border-l border-transparent group-hover:border-zinc-100/80 shadow-[-12px_0_15px_-4px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleAction(row.id, 'REJECTED')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-100/50 hover:shadow-sm">
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                          <button onClick={() => handleAction(row.id, 'APPROVED')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100/50 hover:shadow-sm active:scale-95">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {processed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-display font-semibold text-zinc-900 tracking-tight">
              Audit Log
            </h3>
          </div>
          <div className="bg-white border border-zinc-200/80 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] opacity-80 hover:opacity-100 transition-opacity">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                  <thead className="bg-[#FBFBFB] border-b border-zinc-200/80 text-zinc-500">
                    <tr>
                      <th className="px-6 py-4 text-[13px] font-medium tracking-wide">Record ID</th>
                      <th className="px-6 py-4 text-[13px] font-medium tracking-wide">Scope Mapping</th>
                      <th className="px-6 py-4 text-[13px] font-medium tracking-wide">Normalized Amount</th>
                      <th className="px-6 py-4 text-[13px] font-medium tracking-wide text-right">Terminal Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {processed.map(row => (
                      <tr key={row.id} className="hover:bg-[#FCFCFC] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-zinc-400">#{row.id.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-4 text-zinc-700 font-medium">{row.scope}</td>
                        <td className="px-6 py-4 font-mono text-[13px] font-medium text-zinc-700">{row.normalized_value} <span className="text-zinc-400 font-sans text-[11px] ml-1">{row.normalized_unit}</span></td>
                        <td className="px-6 py-4 text-right">
                           <span className={cn(
                             "inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-widest", 
                             row.status === 'APPROVED' 
                               ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                               : 'bg-rose-50 text-rose-700 border-rose-200/60'
                             )}>
                             {row.status}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function IngestionPanel({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h3 className="text-2xl font-display font-semibold text-zinc-900 mb-2 tracking-tight">Simulate Data Sources</h3>
        <p className="text-zinc-500 max-w-2xl leading-relaxed">Select a source type to push a mock payload into the raw ingestion tables for normalization logic evaluation.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <UploadCard 
           title="SAP Material Export" 
           type="sap"
           icon={<div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100/60 shadow-sm"><FileSpreadsheet className="w-6 h-6" /></div>}
           description="Simulates a flat ALV grid export containing plant and material quantities."
           onComplete={onComplete}
           sampleData={"MANDT,BUKRS,WERKS,MATNR,ERFMG,ERFME,BUDAT\n100,US01,P001,DIESEL-GEN,500,L,20230115\n100,US01,P999,PETROL,100,Gal,20230116\n100,US01,P002,STEEL-ROD,FOO,EA,20230117"}
         />
         <UploadCard 
           title="Utility Portal Data" 
           type="utility"
           icon={<div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100/60 shadow-sm"><FileSpreadsheet className="w-6 h-6" /></div>}
           description="Simulates an energy provider's interval meter reading CSV export files."
           onComplete={onComplete}
           sampleData={"Meter_ID,Service_Start,Service_End,kWh Consumed,Tariff\nM-01,2023-01-01,2023-01-31,4500.5,E19\nM-01,2023-02-01,2023-02-28,-10,E19\nM-02,,,,E20"}
         />
         <UploadCard 
           title="Navan/Concur API" 
           type="travel"
           isJson
           icon={<div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 border border-purple-100/60 shadow-sm"><FileJson className="w-6 h-6" /></div>}
           description="Simulates a corporate travel platform pushing a JSON webhook payload via post."
           onComplete={onComplete}
           sampleData={JSON.stringify({
             trips: [
               { employee_id: "E-100", segments: [{ origin: "SFO", destination: "JFK", cabin_class: "Economy" }] },
               { employee_id: "E-101", segments: [{ origin: "LHR", destination: "XX", cabin_class: "Business" }] }
             ]
           }, null, 2)}
         />
      </div>
    </div>
  );
}

function UploadCard({ title, type, icon, description, onComplete, sampleData, isJson = false }: { title: string, type: string, icon: React.ReactNode, description: string, onComplete: () => void, sampleData: string, isJson?: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    setLoading(true);
    try {
      if (isJson) {
         await fetch('/api/ingest/travel', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: sampleData
         });
      } else {
         const blob = new Blob([sampleData], { type: 'text/csv' });
         const file = new File([blob], `dummy_${type}_data.csv`, { type: 'text/csv' });
         const fd = new FormData();
         fd.append('file', file);
         
         await fetch(`/api/ingest/${type}`, {
           method: 'POST',
           body: fd
         });
      }
      onComplete();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-6 lg:p-7 flex flex-col h-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start gap-4 mb-4">
        {icon}
        <div className="mt-1">
          <h3 className="font-display font-semibold text-zinc-900 tracking-tight text-lg">{title}</h3>
        </div>
      </div>
      <p className="text-sm text-zinc-500 mb-6 leading-relaxed flex-1">{description}</p>
      
      <div className="mt-auto flex flex-col gap-4">
        <div className="bg-[#09090B] rounded-2xl p-4 overflow-hidden relative group border border-zinc-800 shadow-inner">
          <div className="absolute top-0 right-0 bg-zinc-800 text-[9px] text-zinc-400 px-2 py-1 rounded-bl-lg font-mono uppercase tracking-widest border-b border-l border-zinc-700/50">Payload</div>
          <div className="text-[11px] font-mono text-emerald-400/90 overflow-x-auto whitespace-pre leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pt-2">
            {sampleData}
          </div>
        </div>
        <button 
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm active:scale-[0.98]"
        >
          {loading ? (
             <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
          ) : (
             <><UploadCloud className="w-4 h-4 mr-2 text-zinc-400" /> Inject Sample Data</>
          )}
        </button>
      </div>
    </div>
  );
}
