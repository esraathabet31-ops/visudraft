
import React, { useState } from 'react';
import { verifyLiveDeployment, fixFindingsFromAudit } from '../services/geminiService';

interface Checkpoint {
  label: string;
  status: string;
  passed: boolean;
}

interface LiveVerificationProps {
  url: string;
  code: string;
  onCodeUpdated: (newCode: string) => void;
}

const LiveVerification: React.FC<LiveVerificationProps> = ({ url, code, onCodeUpdated }) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const result = await verifyLiveDeployment(url, code);
      if (result && result.checkpoints) {
        setCheckpoints(result.checkpoints);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFixAll = async () => {
    const failedOnes = checkpoints.filter(c => !c.passed).map(c => `${c.label}: ${c.status}`);
    if (failedOnes.length === 0) return;

    setIsFixing(true);
    try {
      const updatedCode = await fixFindingsFromAudit(code, failedOnes);
      onCodeUpdated(updatedCode);
    } catch (e) {
      console.error("Failed to fix issues:", e);
    } finally {
      setIsFixing(false);
    }
  };

  const hasFails = checkpoints.some(c => !c.passed);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-square-check"></i>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live Verification</h3>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status: {iframeLoaded ? 'Online' : 'Loading...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-600 truncate max-w-[150px] md:max-w-md border border-slate-200">
             {url}
           </div>
           <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 p-1.5">
             <i className="fa-solid fa-arrow-up-right-from-square"></i>
           </a>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Browser Preview */}
        <div className="lg:col-span-2 flex flex-col bg-slate-200 border-r border-slate-200">
          <div className="bg-slate-300 h-8 flex items-center gap-2 px-3">
             <div className="flex gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
             </div>
          </div>
          <div className="flex-1 bg-white relative">
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <i className="fa-solid fa-spinner fa-spin text-slate-400 text-xl"></i>
              </div>
            )}
            <iframe
              src={url}
              key={url} // Force reload if URL stays same but code content is new
              title="Live Browser Context"
              className="w-full h-full border-none"
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
        </div>

        {/* QA Audit Panel */}
        <div className="bg-white flex flex-col border-l border-slate-200 overflow-y-auto shadow-inner relative">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-20">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-microscope text-indigo-500"></i>
              QA Checkpoints
            </h4>
            <button
              onClick={runAudit}
              disabled={loading || isFixing}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-rotate-right"></i>}
              {checkpoints.length > 0 ? 'Rerun' : 'Start Audit'}
            </button>
          </div>

          <div className="p-4 flex-1">
            {checkpoints.length === 0 && !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                  <i className="fa-solid fa-clipboard-check text-2xl opacity-20"></i>
                </div>
                <p className="text-xs font-medium max-w-[200px] mx-auto">Click 'Start Audit' to verify your live deployment against key QA standards.</p>
                <button 
                  onClick={runAudit}
                  className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                  Run AI Review
                </button>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100 animate-pulse">
                    <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-5 bg-slate-200 rounded-full w-16"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 pb-24">
                {checkpoints.map((check, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm ${
                      check.passed ? 'bg-green-50/30 border-green-100' : 'bg-amber-50/30 border-amber-100'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-700">{check.label}</span>
                      <span className={`text-[10px] font-medium ${check.passed ? 'text-green-600' : 'text-amber-600'}`}>
                        {check.status}
                      </span>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                      check.passed ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      <i className={`fa-solid text-[10px] ${check.passed ? 'fa-check' : 'fa-exclamation'}`}></i>
                    </div>
                  </div>
                ))}
                
                <div className="mt-8 pt-6 border-t border-slate-100">
                   <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                      <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-info"></i>
                        QA Insight
                      </p>
                      <p className="text-[11px] leading-relaxed text-indigo-900/70 font-medium">
                        Audit performed using Gemini 3 Flash. These checkpoints verify the structural integrity and best practices of your code.
                      </p>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Action Bar for Fixes */}
          {hasFails && !loading && (
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
              <button
                onClick={handleFixAll}
                disabled={isFixing}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl
                  ${isFixing 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 active:scale-95'}`}
              >
                {isFixing ? (
                  <>
                    <i className="fa-solid fa-wand-sparkles fa-spin"></i>
                    Applying AI Repairs...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-magic-wand-sparkles"></i>
                    Fix All Findings
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">
                AI will rebuild the code to address these issues.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveVerification;
