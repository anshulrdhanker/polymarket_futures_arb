'use client';

import React, { useState, useCallback, memo } from 'react';
import { Mail, Send, X, Minus, Square, Users, CornerDownLeft } from 'lucide-react';

// Props interface for GmailInterface
interface GmailInterfaceProps {
  toField: string;
  setToField: (value: string) => void;
  subjectField: string;
  setSubjectField: (value: string) => void;
  bodyField: string;
  setBodyField: (value: string) => void;
  outreachType: 'recruiting' | 'sales' | null;
  setOutreachType: (value: 'recruiting' | 'sales') => void;
  isLoading: boolean;
  typing: boolean;
  typedSubject?: string;
  typedBody?: string;
  onEnterStart: () => void;
  placeholderValues: Record<string, string>;
  setPlaceholderValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

// --- Placeholder chips (inline) ----------------------------------------
const TOKEN_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
const NON_EDITABLE = new Set(['name']); // read-only tokens for now

const PlaceholderChip: React.FC<{
  tokenKey: string;
  editable: boolean;
  value?: string;
  onCommit: (key: string, value: string) => void;
}> = ({ tokenKey, editable, value, onCommit }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [val, setVal] = React.useState(value ?? '');

  React.useEffect(() => setVal(value ?? ''), [value]);

  const commit = React.useCallback(() => {
    onCommit(tokenKey, val.trim());
    setIsEditing(false);
  }, [tokenKey, val, onCommit]);

  const revert = React.useCallback(() => {
    setIsEditing(false);
    setVal(value ?? '');
  }, [value]);

  if (!editable) {
    return (
      <span
        className="px-1 rounded-sm border text-gray-700 bg-gray-100 border-gray-300 cursor-default"
        title="Auto-fills at send"
      >
        {value?.trim() || tokenKey}
      </span>
    );
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            revert();
          }
        }}
        className="px-1 rounded-sm border border-amber-300 text-amber-900 bg-white outline-none"
        placeholder={tokenKey}
      />
    );
  }

  return (
    <button
      type="button"
      className="px-1 bg-amber-50 border border-amber-300 rounded-sm text-amber-900"
      onClick={() => setIsEditing(true)}
    >
      {value?.trim() || tokenKey}
    </button>
  );
};

function renderWithEditablePlaceholders(
  text: string,
  values: Record<string, string>,
  onTokenEdit: (key: string, value: string) => void
) {
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0; // Reset regex state
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) parts.push(before);

    const key = match[1];
    const editable = !NON_EDITABLE.has(key);

    parts.push(
      <PlaceholderChip
        key={`${key}-${match.index}`}
        tokenKey={key}
        editable={editable}
        value={values[key]}
        onCommit={onTokenEdit}
      />
    );
    lastIndex = TOKEN_RE.lastIndex;
  }
  
  const after = text.slice(lastIndex);
  if (after) parts.push(after);

  return parts;
}

// External GmailInterface component with React.memo
const GmailInterface = memo(({
  toField,
  setToField,
  subjectField,
  setSubjectField,
  bodyField,
  setBodyField,
  outreachType,
  setOutreachType,
  isLoading,
  typing,
  typedSubject,
  typedBody,
  onEnterStart,
  placeholderValues,
  setPlaceholderValues,
}: GmailInterfaceProps) => {
  const toInputRef = React.useRef<HTMLInputElement>(null);
  const setPlaceholderValue = React.useCallback((key: string, value: string) => {
    setPlaceholderValues(prev => ({ ...prev, [key]: value }));
  }, [setPlaceholderValues]);

  // Compute display values based on typing state
  const subjectForUI = typing ? (typedSubject ?? subjectField) : subjectField;
  const displayBody = typing ? (typedBody ?? bodyField) : bodyField;

  // Memoized handlers for input fields
  const handleToFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToField(e.target.value);
  }, [setToField]);

  const handleToKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!toField.trim() || isLoading) return;
      onEnterStart();
    }
  }, [onEnterStart, toField, isLoading]);

  const handleSubjectFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSubjectField(e.target.value);
  }, [setSubjectField]);



  return (
    <div className="w-full flex flex-col items-center pb-4 px-4 pt-0">
      <div className="w-full max-w-3xl relative z-10">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between w-full">
              {/* Left side: Recruiting | Sales */}
              <div className="flex items-center space-x-1 text-sm font-medium text-gray-700" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                <button
                  onClick={() => setOutreachType('recruiting')}
                  className={`transition-colors duration-200 ${
                    outreachType === 'recruiting' ? 'text-black font-semibold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Recruiting
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => setOutreachType('sales')}
                  className={`transition-colors duration-200 ${
                    outreachType === 'sales' ? 'text-black font-semibold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sales
                </button>
              </div>
              
              {/* Right side: Chips */}
              <div className="flex gap-2">
                {["Role", "Location", "Company Size", "Industry", "Experience Level", "Skills"].map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 bg-white/40 backdrop-blur-sm text-xs opacity-50"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-1 p-4 space-y-2">
            <div className="flex items-center border-b border-gray-200 py-2 rounded-md">
              <label htmlFor="to-input" className="w-12 text-sm text-gray-500">To:</label>
              <input
                id="to-input"
                ref={toInputRef}
                type="text"
                value={toField}
                onChange={handleToFieldChange}
                onKeyDown={handleToKeyDown}
                placeholder={
                  outreachType === 'sales'
                    ? 'VP of BizDev at a CPG company in NYC'
                    : 'VP of Engineering at an AI startup in SF'
                }
                className="flex-1 px-2 py-1 text-gray-900 placeholder-gray-400 placeholder-italic
                         border border-gray-200 bg-gray-50 rounded-lg sm:text-sm
                         hover:border-gray-300 focus:outline-none focus:ring-2
                         focus:ring-gray-300 focus:border-gray-400 transition-colors"
                disabled={isLoading}
                aria-describedby="to-input-hint"
              />
              <div id="to-input-hint" className="sr-only">
                Type a job title, company, or keywords to search for prospects
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-500 ml-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!toField.trim() || isLoading) return;
                    onEnterStart();
                  }}
                  disabled={!toField.trim() || isLoading}
                  title={toField.trim() ? 'Press Enter or click to continue' : "Type who you're looking for"}
                  className={`p-1.5 rounded-md border transition-all ${
                    toField.trim() && !isLoading
                      ? 'border-gray-300 hover:bg-gray-100'
                      : 'border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                  aria-label="Proceed (Enter)"
                >
                  <CornerDownLeft className="h-4 w-4" />
                </button>
                <span>Cc</span>
                <span>Bcc</span>
              </div>
            </div>

            <div className="flex items-center border-b border-gray-200 py-2">
              <label className="text-sm text-gray-600 w-14 mr-2" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                Subject
              </label>
              <input
                type="text"
                value={subjectForUI}
                onChange={handleSubjectFieldChange}

                readOnly={typing}
                className={`flex-1 py-1 text-gray-900 placeholder-gray-400 placeholder-italic border-none outline-none text-sm ${typing ? 'opacity-70' : ''}`}
                style={{ fontFamily: 'Satoshi, sans-serif' }}
              />
            </div>

            <div className="pt-3">
              <div className={`${typing ? 'opacity-70 pointer-events-none' : ''}`}>
                <div
                  className="w-full py-2 text-gray-700 text-sm min-h-[150px] whitespace-pre-wrap"
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                >
                  {renderWithEditablePlaceholders(displayBody, placeholderValues, setPlaceholderValue)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Single footer with search button */}
          <div className="px-4 pb-4 pt-4 border-t border-gray-200">
            {toField.trim() && !isLoading && (
              <div className="text-xs text-gray-500 mb-2 text-center">
                Press <span className="font-medium text-gray-700">Enter</span> or click 
                <CornerDownLeft className="inline-block h-3.5 w-3.5 mx-1 align-text-bottom" />
                to continue
              </div>
            )}
            <div className="flex items-center justify-end">
              <button
                onClick={onEnterStart}
                disabled={!toField.trim() || isLoading}
                className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
                  toField.trim() && !isLoading
                    ? 'bg-gray-50 text-gray-900 border border-gray-200 hover:bg-gray-100 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
                style={{ fontFamily: 'Satoshi, sans-serif' }}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Searching prospects...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Add display name for better debugging
GmailInterface.displayName = 'GmailInterface';


interface Prospect {
  name: string;
  title: string;
  company: string;
  email?: string;
  location?: string;
}

interface BackendCandidate {
  id: string;
  first_name?: string;
  full_name?: string;
  work_email?: string;
  job_title?: string;
  job_company_name?: string;
  job_company_size?: string;
  job_company_industry?: string;
  linkedin_url?: string;
  location_name?: string;
  skills?: string[];
  inferred_years_experience?: number;
}

export default function MainPage() {
  const [activeTab, setActiveTab] = useState('compose');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProspects, setSelectedProspects] = useState<Set<number>>(new Set());
  const [prospects, setProspects] = useState<Prospect[]>([]);

  // Gmail interface state
  const [toField, setToField] = useState('');
  const [subjectField, setSubjectField] = useState('');
  const [bodyField, setBodyField] = useState('');
  const [outreachType, setOutreachType] = useState<'recruiting' | 'sales' | null>('recruiting');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});

  // --- Typing UX state ---
  const [typing, setTyping] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [typedSubject, setTypedSubject] = useState('');
  const [typedBody, setTypedBody] = useState('');

  // --- Typing helper ---
  const typeInto = (text: string, setFn: (s: string) => void, speed = 40) =>
    new Promise<void>((resolve) => {
      setTyping(true);
      setFn('');
      let i = 0;
      const id = setInterval(() => {
        i++;
        setFn(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(id);
          setTyping(false);
          resolve();
        }
      }, speed);
    });

  // Template builders for recruiting outreach
  const buildSubject = () => `Quick chat about your background?`;

  const buildBody = () => `Hi {name},
Your background in {skills} stood out — we're hiring a {role_title} at {recruiter_company}, where we're passionate about {recruiter_mission}. This role is based in {location} ({is_remote}). Would you be open to a quick chat?

Thanks,
{recruiter_name} | {recruiter_title} at {recruiter_company}`;

  // --- Start typing flow from template ---
  const startTypingFromTemplate = async () => {
    const subject = buildSubject();
    const body = buildBody();

    setIsTypingComplete(false);
    // animate into the "typed" buffers
    await typeInto(subject, setTypedSubject, 10);
    await typeInto(body, setTypedBody, 8);

    // after animation ends, sync into the real editable fields
    setSubjectField(subject);
    setBodyField(body);

    setIsTypingComplete(true);
  };

  // --- Single entry point that will be called on Enter (next step) ---
  // Fires typing immediately and your existing backend search.
  const startSearch = async () => {
    if (!toField.trim() || isLoading || typing) return; // Added typing guard
    setActiveTab('compose');
    setIsTypingComplete(false);
    await startTypingFromTemplate(); // Wait for typing to complete
    await handleGmailSend(); // Then send the email
  };

  // Suppress unused variable warnings for now
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedVars = { typing, typedSubject, typedBody };

  const compileBody = (tpl: string, vals: Record<string, string>) => {
    TOKEN_RE.lastIndex = 0;
    return tpl.replace(TOKEN_RE, (_m, k) => (vals[k]?.trim() ? vals[k].trim() : `{${k}}`));
  };

  const handleGmailSend = async () => {
    console.log("🚀 handleGmailSend called!");
    
    if (!toField.trim() || !outreachType) return;

    setIsLoading(true);
    
    try {
      console.log('Starting search request...', { toField, outreachType });
      
      // Compile the body with current placeholder values
      const compiledBody = compileBody(bodyField.trim(), placeholderValues);
      
      // Call your actual API endpoint
      const response = await fetch('/api/search/prospects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add back when auth is ready
          // 'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          toField: toField.trim(),
          bodyField: compiledBody,
          outreachType: outreachType
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API call failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Search response:', data);
      
      // Backend now returns campaignId for polling
      if (data.campaignId) {
        setCampaignId(data.campaignId);
        console.log('Campaign created, starting polling...', data.campaignId);
        
        // Start polling for results
        pollForCampaignResults(data.campaignId);
      } else {
        throw new Error('No campaign ID returned from server');
      }

    } catch (error) {
      console.error('Failed to start search:', error);
      alert(`Failed to start search: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const pollForCampaignResults = async (campaignId: string) => {
    try {
      console.log('Polling campaign:', campaignId);
      
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add back when auth is ready
          // 'Authorization': `Bearer ${userToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get campaign status: ${response.status}`);
      }

      const campaign = await response.json();
      console.log('Campaign status:', campaign.status, campaign);
      
      if (campaign.status === 'completed' || campaign.status === 'partial') {
        // Use results or fall back to candidates or empty array
        const sourceData = campaign.results || campaign.candidates || campaign.prospects || [];
        
        // Map candidates to prospects
        const convertedProspects = sourceData.map((candidate: BackendCandidate) => ({
          name: candidate.full_name || `${candidate.first_name || ''}`.trim() || 'Unknown',
          title: candidate.job_title || '',
          company: candidate.job_company_name || '',
          email: candidate.work_email,
          location: candidate.location_name
        }));
        
        console.log('Converted prospects:', convertedProspects);
        setProspects(convertedProspects);
        setActiveTab('prospects');
        setIsLoading(false);
        
        // Log that prospects are ready and user can switch tabs
        console.log(`Prospects ready (${convertedProspects.length} found), user can switch tabs when ready`);
        
      } else if (campaign.status === 'failed') {
        // Campaign failed
        console.error('Campaign failed:', campaign.error);
        alert(`Search failed: ${campaign.error || 'Unknown error occurred'}`);
        setIsLoading(false);
        
      } else if (campaign.status === 'processing' || campaign.status === 'active' || campaign.status === 'pending') {
        // Still processing, poll again in 2 seconds
        console.log('Campaign still processing, polling again in 2s...');
        setTimeout(() => {
          pollForCampaignResults(campaignId);
        }, 2000);
        
      } else {
        // Unknown status, keep polling but with longer interval
        console.warn('Unknown campaign status:', campaign.status);
        setTimeout(() => {
          pollForCampaignResults(campaignId);
        }, 3000);
      }

    } catch (error) {
      console.error('Error polling campaign results:', error);
      
      // Retry polling a few times before giving up
      const retryCount = (window as any).pollRetryCount || 0;
      if (retryCount < 3) {
        (window as any).pollRetryCount = retryCount + 1;
        console.log(`Polling error, retrying... (${retryCount + 1}/3)`);
        setTimeout(() => {
          pollForCampaignResults(campaignId);
        }, 5000);
      } else {
        setIsLoading(false);
        alert('Error getting search results. Please try again.');
        (window as any).pollRetryCount = 0;
      }
    }
  };

  const handleProspectSelect = (index: number) => {
    const newSelected = new Set(selectedProspects);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProspects(newSelected);
  };

  const sendOutreach = async () => {
    if (selectedProspects.size === 0) return;
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Outreach sent to ${selectedProspects.size} prospects!`);
      setSelectedProspects(new Set());
    } catch (error) {
      alert('Failed to send outreach. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // GmailInterface has been moved outside and memoized

  const ProspectsList = () => {
    if (prospects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
          <Users className="h-12 w-12 mb-4 text-gray-300" />
          <p className="text-sm font-medium">No prospects found yet</p>
        </div>
      );
    }
    
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Found {prospects.length} prospects
          </h3>
          <button 
            onClick={sendOutreach}
            disabled={selectedProspects.size === 0 || isLoading}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              selectedProspects.size > 0 && !isLoading
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={{ fontFamily: 'Satoshi, sans-serif' }}
          >
            {isLoading ? 'Sending...' : `Send to Selected (${selectedProspects.size})`}
          </button>
        </div>
        <div className="space-y-3">
          {prospects.map((prospect: Prospect, index: number) => (
            <div key={index} className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors duration-200">
              <input 
                type="checkbox" 
                checked={selectedProspects.has(index)}
                onChange={() => handleProspectSelect(index)}
                className="h-4 w-4 rounded border-gray-300" 
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  {prospect.name}
                </div>
                <div className="text-sm text-gray-500" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  {prospect.title} @ {prospect.company}
                </div>
                {prospect.email && (
                  <div className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    {prospect.email}
                  </div>
                )}
                {prospect.location && (
                  <div className="text-xs text-gray-400" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    📍 {prospect.location}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'compose', name: 'Compose', icon: Mail },
    { id: 'prospects', name: 'Prospects', icon: Users, count: prospects.length }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-full px-8 py-3">
          <div className="flex justify-between items-center">
            <h1 
              className="text-lg font-bold text-white tracking-tight flex items-baseline"
              style={{ fontFamily: 'Satoshi, sans-serif', letterSpacing: '-0.5px' }}
            >
              sement.
              <span className="inline-block w-px mx-4 bg-white/40 h-3"></span>
              <span className="font-normal text-base text-white/90">reach</span>
            </h1>
            <nav className="flex items-center space-x-6">
              <a href="#" className="text-sm font-medium text-white/90 hover:text-white transition-colors" style={{ fontFamily: 'Satoshi, sans-serif' }}>Pricing</a>
              <a href="#" className="text-sm font-medium text-white/90 hover:text-white transition-colors" style={{ fontFamily: 'Satoshi, sans-serif' }}>Support</a>
              <a href="#" className="text-sm font-medium text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors border border-white/20" style={{ fontFamily: 'Satoshi, sans-serif' }}>Log In</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 text-center">
        <div className="max-w-2xl mx-auto px-8">
          <h1 
            className="text-4xl font-medium text-black leading-tight tracking-tight mb-3"
            style={{ fontFamily: 'Satoshi, sans-serif', letterSpacing: '-0.05em' }}
          >
            <span></span>
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8 pb-8">
        {/* Toggle Navigation */}
        <div className="flex justify-center mb-6">
          <nav className="flex gap-2 p-1 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    active
                      ? "bg-white/25 text-white ring-1 ring-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
                      : "text-white/90 hover:bg-white/10 hover:ring-1 hover:ring-white/25"
                  ].join(" ")}
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Main Content Area */}
        <div className="mt-6">
          {activeTab === 'compose' && (
            <GmailInterface
              toField={toField}
              setToField={setToField}
              subjectField={subjectField}
              setSubjectField={setSubjectField}
              bodyField={bodyField}
              setBodyField={setBodyField}
              outreachType={outreachType}
              setOutreachType={setOutreachType}
              isLoading={isLoading}
              typing={typing}
              typedSubject={typedSubject}
              typedBody={typedBody}
              onEnterStart={startSearch}
              placeholderValues={placeholderValues}
              setPlaceholderValues={setPlaceholderValues}
            />
          )}
          
          {activeTab === 'prospects' && <ProspectsList />}
        </div>
      </main>
      
      <style jsx global>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap');
        
        * {
          box-sizing: border-box;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        body {
          font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
}