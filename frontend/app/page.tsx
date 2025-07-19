'use client';

import React, { useState } from 'react';
import { Mail, Send, X, Minus, Square, Users } from 'lucide-react';


interface Prospect {
  name: string;
  title: string;
  company: string;
  email?: string;
  location?: string;
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
  const [outreachType, setOutreachType] = useState<'recruiting' | 'sales' | null>(null);

  const handleGmailSend = async () => {
    if (!toField.trim()) return;

    setIsLoading(true);
    
    try {
      // Mock search based on the "To" field
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockProspects: Prospect[] = outreachType === 'recruiting' ? [
        { name: 'Alex Chen', title: 'Senior Software Engineer', company: 'TechCorp AI', email: 'alex@techcorp.ai', location: 'San Francisco, CA' },
        { name: 'Sarah Kim', title: 'Full Stack Developer', company: 'StartupXYZ', email: 'sarah@startupxyz.com', location: 'San Francisco, CA' },
        { name: 'Marcus Johnson', title: 'Lead Engineer', company: 'InnovateCo', email: 'marcus@innovateco.io', location: 'Palo Alto, CA' },
        { name: 'Emily Rodriguez', title: 'Senior Developer', company: 'AI Dynamics', email: 'emily@aidynamics.com', location: 'San Francisco, CA' },
        { name: 'David Park', title: 'Software Engineer', company: 'FutureTech', email: 'david@futuretech.ai', location: 'Mountain View, CA' }
      ] : [
        { name: 'Jennifer Walsh', title: 'VP of Engineering', company: 'ScaleAI', email: 'jennifer@scaleai.com', location: 'San Francisco, CA' },
        { name: 'Michael Torres', title: 'Head of Engineering', company: 'DeepMind Labs', email: 'michael@deepmind.io', location: 'Palo Alto, CA' },
        { name: 'Lisa Chang', title: 'Engineering Director', company: 'Anthropic', email: 'lisa@anthropic.com', location: 'San Francisco, CA' },
        { name: 'Robert Kim', title: 'VP Engineering', company: 'OpenAI', email: 'robert@openai.com', location: 'San Francisco, CA' },
        { name: 'Amanda Foster', title: 'Head of Engineering', company: 'Cohere', email: 'amanda@cohere.ai', location: 'San Francisco, CA' }
      ];

      setProspects(mockProspects);
      setTimeout(() => {
        setActiveTab('prospects');
      }, 500);

    } catch (error) {
      console.error('Failed to find prospects:', error);
    } finally {
      setIsLoading(false);
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

  const GmailInterface = () => {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {/* Gmail-style Email Window */}
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            {/* Window Header with Recruiting/Sales Toggle */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-1 text-sm font-medium text-gray-700" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                <button
                  onClick={() => setOutreachType('recruiting')}
                  className={`transition-colors duration-200 ${
                    outreachType === 'recruiting' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Recruiting
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => setOutreachType('sales')}
                  className={`transition-colors duration-200 ${
                    outreachType === 'sales' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Sales
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 hover:bg-gray-200 rounded">
                  <Minus className="h-4 w-4 text-gray-500" />
                </button>
                <button className="p-1 hover:bg-gray-200 rounded">
                  <Square className="h-4 w-4 text-gray-500" />
                </button>
                <button className="p-1 hover:bg-gray-200 rounded">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Email Fields */}
            <div className="p-4 space-y-2">
              {/* To Field */}
              <div className="flex items-center border-b border-gray-200 py-2">
                <label className="text-sm text-gray-600 w-14 mr-2" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  To
                </label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={toField}
                    onChange={(e) => setToField(e.target.value)}
                    placeholder="VP of Engineering at AI startups in SF"
                    className="w-full py-1 text-gray-900 placeholder-gray-400 border-none outline-none text-sm"
                    style={{ fontFamily: 'Satoshi, sans-serif' }}
                  />
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-500 ml-2">
                  <span>Cc</span>
                  <span>Bcc</span>
                </div>
              </div>

              {/* Subject Field */}
              <div className="flex items-center border-b border-gray-200 py-2">
                <label className="text-sm text-gray-600 w-14 mr-2" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subjectField}
                  onChange={(e) => setSubjectField(e.target.value)}
                  placeholder="Subject"
                  className="flex-1 py-1 text-gray-900 placeholder-gray-400 border-none outline-none text-sm"
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                />
              </div>

              {/* Email Body */}
              <div className="pt-3">
                <textarea
                  value={bodyField}
                  onChange={(e) => setBodyField(e.target.value)}
                  placeholder="Compose your message..."
                  rows={6}
                  className="w-full py-2 border-none outline-none text-gray-700 text-sm resize-none"
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleGmailSend}
                  disabled={!toField.trim() || isLoading}
                  className={`px-6 py-2 rounded-md font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
                    toField.trim() && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Finding...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send</span>
                    </>
                  )}
                </button>
                
                <div className="flex items-center space-x-2 text-gray-400">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Mail className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
          {prospects.map((prospect, index) => (
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
    <div className="min-h-screen bg-[#fdfcfa]" style={{
      backgroundImage: `
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0),
        radial-gradient(circle at 2px 3px, rgba(0,0,0,0.02) 1px, transparent 0),
        radial-gradient(circle at 3px 1px, rgba(0,0,0,0.025) 1px, transparent 0)
      `,
      backgroundSize: '20px 20px, 15px 15px, 25px 25px'
    }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-width-full px-8 py-3">
          <div className="flex justify-between items-center">
            <h1 
              className="text-lg font-bold text-black tracking-tight flex items-baseline"
              style={{ fontFamily: 'Satoshi, sans-serif', letterSpacing: '-0.5px' }}
            >
              sement.
              <span className="inline-block w-px mx-4 bg-gray-400 h-3 opacity-50"></span>
              <span className="font-normal text-base opacity-90">reach</span>
            </h1>
            <nav className="flex items-center space-x-8">
              <a href="#" className="text-sm font-medium text-gray-700 hover:text-black transition-colors" style={{ fontFamily: 'Satoshi, sans-serif' }}>Pricing</a>
              <a href="#" className="text-sm font-medium text-gray-700 hover:text-black transition-colors" style={{ fontFamily: 'Satoshi, sans-serif' }}>Support</a>
              <a href="#" className="text-sm font-medium text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Satoshi, sans-serif' }}>Log In</a>
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
            <span>Your People Reach Machine</span>
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8 pb-8">
        {/* Toggle Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-gray-200/60 p-1 shadow-sm">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                    style={{ fontFamily: 'Satoshi, sans-serif' }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'compose' ? <GmailInterface /> : <ProspectsList />}
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