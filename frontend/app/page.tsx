'use client';

// Base URL for API requests
const API_BASE = 'http://localhost:3001';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Users, Mail, Send } from 'lucide-react';
import ShinyText from './components/ShinyText';

interface Message {
  type: 'user' | 'bot';
  text: string;
}

interface Prospect {
  name: string;
  title: string;
  company: string;
  email?: string;
  linkedin?: string;
  location?: string;
}

interface ConversationState {
  currentStep: number;
  isComplete: boolean;
  collectedData: {
    outreach_type?: 'recruiting' | 'sales';
    recruiter_title?: string;
    recruiter_company?: string;
    recruiter_mission?: string;
    tone?: string;
    // Recruiting specific
    role_title?: string;
    skills?: string;
    experience_level?: string;
    // Sales specific
    buyer_title?: string;
    pain_point?: string;
    // Shared
    company_size?: string;
    industry?: string;
    location?: string;
  };
}

interface Campaign {
  id: string;
  status: 'active' | 'searching' | 'completed';
  conversationState: ConversationState | null;
  prospects: Prospect[];
}

interface EmptyStateProps {
  message: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center h-96 text-gray-400">
    <Icon className="h-12 w-12 mb-4 text-gray-300" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

export default function MainPage() {
  const [activeTab, setActiveTab] = useState('chatbot');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  // Input state moved to ChatInput component
  const [showChevron, setShowChevron] = useState(false);
  const [selectedProspects, setSelectedProspects] = useState<Set<number>>(new Set());

  const hasTriggered = useRef(false);

  // Get dynamic labels based on outreach type
  const getLabels = () => {
    const outreachType = campaign?.conversationState?.collectedData?.outreach_type;
    if (outreachType === 'recruiting') {
      return {
        prospects: 'candidates',
        action: 'recruiting',
        placeholder: 'What role are you looking to hire for?',
        welcome: "Hi! I'm Reach. I'll help you find the perfect candidates and send personalized recruiting emails to them automatically. First, are you doing recruiting or sales outreach?"
      };
    } else if (outreachType === 'sales') {
      return {
        prospects: 'prospects',
        action: 'sales',
        placeholder: 'Who are you looking to reach for sales?',
        welcome: "Hi! I'm Reach. I'll help you find the perfect prospects and send personalized sales emails to them automatically. First, are you doing recruiting or sales outreach?"
      };
    } else {
      return {
        prospects: 'prospects',
        action: 'outreach',
        placeholder: 'What type of outreach are you doing?',
        welcome: "Hi! I'm Reach. I'll help you find the right people and send personalized emails to them automatically. First, what kind of outreach are you doing — sales or recruiting?"
      };
    }
  };

  const labels = getLabels();

  // Initialize campaign when component mounts
  useEffect(() => {
    initializeCampaign();
  }, []);

  // Initialize welcome message - TEMPORARILY DISABLED FOR DEBUGGING
  // Debug logs removed

  // Scroll and chevron logic
  useEffect(() => {
    const trigger = () => {
      if (hasTriggered.current) return;
      hasTriggered.current = true;
      scrollToHeader();
    };

    window.addEventListener('wheel', trigger, { passive: true, once: true });
    window.addEventListener('touchmove', trigger, { passive: true, once: true });
    
    const handleKeydown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) trigger();
    };
    window.addEventListener('keydown', handleKeydown, { once: true });

    return () => {
      window.removeEventListener('wheel', trigger);
      window.removeEventListener('touchmove', trigger);
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowChevron(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const scrollToHeader = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    });
  };

  const initializeCampaign = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Campaign ${Date.now()}`,
          conversationData: {
            // Base required fields
            outreach_type: 'recruiting',
            user_title: 'placeholder',
            user_company: 'placeholder', 
            user_mission: 'placeholder',
            
            // Recruiting fields (since we default to recruiting)
            role_title: 'placeholder',
            skills: 'placeholder',
            experience_level: 'junior',
            company_size: 'placeholder',
            industry: 'placeholder',
            location: 'placeholder'
          }
        })
      });

      if (response.ok) {
        const newCampaign = await response.json();
        const campaignData = {
          id: newCampaign.data.campaignId,  // Note: using the actual response structure
          status: 'active' as 'active',  // Type assertion to match Campaign type
          conversationState: null,
          prospects: []
        };
        
        setCampaign(campaignData);
        
        // Initialize chat after campaign is created
        await initializeChat(campaignData.id);
        
      }
    } catch (error) {
      console.error('Failed to initialize campaign:', error);
      // For now, create a mock campaign for development
      const mockCampaign = {
        id: 'mock-campaign-' + Date.now(),
        status: 'active' as 'active',  // Type assertion to match Campaign type
        conversationState: null,
        prospects: []
      };
      setCampaign(mockCampaign);
      
      // Initialize chat for mock campaign too
      await initializeChat(mockCampaign.id);
    }
  };

  const initializeChat = async (campaignId: string) => {
    try {
      console.log("🤖 Initializing chat for campaign:", campaignId);
      
      const response = await fetch(`${API_BASE}/api/campaigns/${campaignId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: null,  // Special case: get first message
          conversationState: null
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Add bot's first message to chat
        const botMessage: Message = { type: 'bot', text: result.response };
        setMessages([botMessage]);

        // Update campaign with conversation state
        setCampaign(prev => prev ? {
          ...prev,
          conversationState: result.conversationState
        } : null);

        console.log("🤖 Chat initialized with first message:", result.response);
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      // Fallback: show a generic message
      const fallbackMessage: Message = { 
        type: 'bot', 
        text: 'Hi! I\'m here to help you find the right people for outreach. What can I help you with today?' 
      };
      setMessages([fallbackMessage]);
    }
  };

  const sendMessage = async (message: string) => {
    console.log("🔥 sendMessage called with:", message);
    console.log("🔥 campaign state:", campaign);
    
    if (!campaign) {
      console.log("🔥 NO CAMPAIGN - early return");
      return;
    }
    if (!campaign) return;

    setIsLoading(true);
    
    // Add user message to UI immediately
    const userMessage: Message = { type: 'user', text: message };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add JWT token if you have auth implemented
        },
        body: JSON.stringify({
          message: message,
          conversationState: campaign.conversationState
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Add bot response
        const botMessage: Message = { type: 'bot', text: result.response };
        setMessages(prev => [...prev, botMessage]);

        // Update campaign conversation state
        setCampaign(prev => prev ? {
          ...prev,
          conversationState: result.conversationState
        } : null);

        // Check if conversation is complete and search should be triggered
        if (result.should_search && result.conversationState?.isComplete) {
          await triggerProspectSearch(result.conversationState, result.pdlQuery);
        }
      } else {
        // Fallback response for development
        const botMessage: Message = { 
          type: 'bot', 
          text: 'I understand. Could you tell me more about that?' 
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Fallback response for development
      const botMessage: Message = { 
        type: 'bot', 
        text: 'Sorry, I encountered an error. Could you please try again?' 
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerProspectSearch = async (conversationState: ConversationState, pdlQuery?: any) => {
    if (!campaign) return;

    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationState,
          pdlQuery,
          maxCandidates: 50
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update campaign with prospects
        setCampaign(prev => prev ? {
          ...prev,
          status: 'completed',
          prospects: result.prospects
        } : null);

        // Show success message with dynamic content based on outreach type
        const outreachType = conversationState.collectedData.outreach_type;
        const prospectsLabel = outreachType === 'recruiting' ? 'candidates' : 'prospects';
        
        const botMessage: Message = { 
          type: 'bot', 
          text: `Perfect! I found ${result.prospects.length} potential ${prospectsLabel}. You can view them in the Prospects tab.` 
        };
        setMessages(prev => [...prev, botMessage]);

        // Auto-switch to prospects tab
        setTimeout(() => {
          setActiveTab('prospects');
        }, 2000);
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Failed to search prospects:', error);
      
      // Mock data for development - different based on type
      const outreachType = conversationState.collectedData.outreach_type;
      const mockProspects: Prospect[] = outreachType === 'recruiting' ? [
        { name: 'John Doe', title: 'Senior Software Engineer', company: 'Tech Corp', email: 'john@techcorp.com' },
        { name: 'Jane Smith', title: 'Frontend Developer', company: 'StartupXYZ', email: 'jane@startupxyz.com' },
        { name: 'Mike Johnson', title: 'Full Stack Developer', company: 'DevCo', email: 'mike@devco.com' }
      ] : [
        { name: 'Sarah Wilson', title: 'Head of Marketing', company: 'GrowthCorp', email: 'sarah@growthcorp.com' },
        { name: 'David Chen', title: 'VP of Sales', company: 'ScaleUp Inc', email: 'david@scaleup.com' },
        { name: 'Lisa Brown', title: 'Marketing Director', company: 'BrandCo', email: 'lisa@brandco.com' }
      ];

      setCampaign(prev => prev ? {
        ...prev,
        status: 'completed',
        prospects: mockProspects
      } : null);

      const prospectsLabel = outreachType === 'recruiting' ? 'candidates' : 'prospects';
      const botMessage: Message = { 
        type: 'bot', 
        text: `Great! I found ${mockProspects.length} potential ${prospectsLabel}. Check them out in the Prospects tab.` 
      };
      setMessages(prev => [...prev, botMessage]);

      setTimeout(() => {
        setActiveTab('prospects');
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // handleSendMessage moved to ChatInput component

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
    if (!campaign || selectedProspects.size === 0) return;

    setIsLoading(true);
    
    try {
      const selectedProspectsList = Array.from(selectedProspects).map(index => 
        campaign.prospects[index]
      );

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/outreach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prospects: selectedProspectsList,
          conversationState: campaign.conversationState
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Outreach sent to ${result.summary.successful} prospects! ${result.summary.failed} failed.`);
        setSelectedProspects(new Set());
      } else {
        throw new Error('Outreach failed');
      }
    } catch (error) {
      console.error('Failed to send outreach:', error);
      alert('Failed to send outreach. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  const tabs = [
    { id: 'chatbot', name: 'Chatbot', icon: MessageCircle },
    { id: 'prospects', name: labels.prospects === 'candidates' ? 'Candidates' : 'Prospects', icon: Users }
  ];

  // Define interface for ChatInput props
  interface ChatInputProps {
    onSendMessage: (message: string) => void;
    disabled: boolean;
    placeholder: string;
  }
  
  // Memoized ChatInput component with local state management
  const ChatInput = React.memo<ChatInputProps>(({ onSendMessage, disabled, placeholder }) => {
    // Local state for input value
    const [localInputValue, setLocalInputValue] = useState('');
    
    // Handle input changes locally
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalInputValue(e.target.value);
    };
    
    // Handle sending messages
    const handleSend = () => {
      if (!localInputValue.trim()) return;
      onSendMessage(localInputValue);
      setLocalInputValue(''); // Clear input after sending
    };
    
    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };
    
    return (
      <div className="backdrop-blur-md bg-white/60 border border-white/20 rounded-xl shadow-md p-6">
        <textarea
          value={localInputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-transparent text-gray-800 placeholder-gray-500 text-lg resize-none border-none outline-none"
          style={{ fontFamily: 'Satoshi, sans-serif' }}
          disabled={disabled}
        />
        
        {/* Bottom Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-white/30 rounded-lg transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            <span className="text-sm text-gray-600 bg-white/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              {disabled ? 'Determining...' : (localInputValue ? 'Typing...' : 'Ready')}
            </span>
          </div>
          
          <button
            onClick={handleSend}
            disabled={!localInputValue.trim() || disabled}
            className={`p-3 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/20 ${
              localInputValue.trim() && !disabled
                ? 'bg-white/50 hover:bg-white/70 text-gray-700 shadow-md' 
                : 'bg-white/20 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
            </svg>
          </button>
        </div>
      </div>
    );
  });

  const ChatInterface = () => {
    return (
      <div className="flex items-center justify-center min-h-96 p-8">
        <div className="w-full max-w-3xl">
          {/* Conversation History */}
          <div className="mb-8 space-y-6">
            {messages.map((message, index) => (
              <div key={index} className="space-y-4">
                {message.type === 'user' && (
                  <div className="backdrop-blur-md bg-white/70 border border-white/20 rounded-lg p-4 shadow-sm">
                    <p className="text-gray-900" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                      {message.text}
                    </p>
                  </div>
                )}
                {message.type === 'bot' && (
                  <div className="backdrop-blur-md bg-white/50 border border-white/20 rounded-lg p-4 shadow-sm">
                    <p className="text-gray-900" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                      {message.text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="mb-8 backdrop-blur-md bg-white/50 border border-white/20 rounded-lg p-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-500" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  {campaign?.status === 'searching' ? `Searching for ${labels.prospects}...` : 'Thinking...'}
                </span>
              </div>
            </div>
          )}

          {/* Chat Input - Using memoized component with isolated state */}
          <ChatInput 
            onSendMessage={sendMessage}
            placeholder={labels.placeholder}
            disabled={isLoading}
          />
        </div>
      </div>
    );
  };

  const ProspectsList = () => {
    const prospects = campaign?.prospects || [];
    
    if (prospects.length === 0) {
      return <EmptyState message={`No ${labels.prospects} yet, start a conversation first`} icon={Users} />;
    }
    
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Found {prospects.length} {labels.prospects}
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chatbot':
        return <ChatInterface />;
      case 'prospects':
        return <ProspectsList />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <>
      {/* Section 1: Landing Hero */}
      <section className="h-screen flex flex-col items-center justify-center bg-[#fdfcfa]" style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0),
          radial-gradient(circle at 2px 3px, rgba(0,0,0,0.02) 1px, transparent 0),
          radial-gradient(circle at 3px 1px, rgba(0,0,0,0.025) 1px, transparent 0)
        `,
        backgroundSize: '20px 20px, 15px 15px, 25px 25px'
      }}>
        <div className="max-w-2xl mx-auto px-8 text-center mb-16">
          <Send className="h-12 w-12 text-black mb-6 mx-auto" strokeWidth={1.5} />
          <h1 
            className="text-4xl font-medium text-black leading-tight tracking-tight"
            style={{ fontFamily: 'Satoshi, sans-serif', letterSpacing: '-0.05em' }}
          >
            Your <ShinyText text="People Reach" disabled={false} speed={3} className='text-inherit' /> Machine.
          </h1>
          <p className="text-gray-500 text-lg mt-3" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Find Anyone. Reach Them Automatically.
          </p>
        </div>
      </section>

      {/* Section 2: Main Application */}
      <div className="min-h-screen relative" style={{ 
        backgroundColor: '#fdfcfa',
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
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-black transition-colors" style={{ fontFamily: 'Satoshi, sans-serif' }}>Use Cases</a>
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-black transition-colors" style={{ fontFamily: 'Satoshi, sans-serif' }}>Pricing</a>
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-black transition-colors" style={{ fontFamily: 'Satoshi, sans-serif' }}>Support</a>
                <a href="#" className="text-sm font-medium text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Satoshi, sans-serif' }}>Log In</a>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-32 text-center">
          <div className="max-w-2xl mx-auto px-8">
            <h1 
              className="text-4xl font-medium text-black mb-6 leading-tight tracking-tight"
              style={{ fontFamily: 'Satoshi, sans-serif', letterSpacing: '-0.05em' }}
            >
              Who are you looking for?
            </h1>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-8 pb-16">
          {/* Toggle Navigation */}
          <div className="flex justify-center mb-3" style={{ transform: 'translateY(-80px)' }}>
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
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ transform: 'translateY(-80px)' }}>
            {renderTabContent()}
          </div>
        </main>
      </div>

      {/* Bouncing Chevron */}
      {showChevron && (
        <div 
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer z-50 animate-bounce"
          onClick={scrollToHeader}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <path d="M7 13l5 5 5-5"/>
          </svg>
        </div>
      )}

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
    </>
  );
}