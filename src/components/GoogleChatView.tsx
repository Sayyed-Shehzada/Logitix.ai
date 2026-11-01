import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  RefreshCw,
  Users,
  Hash,
  UserCheck,
  AlertCircle,
  Search,
  Check,
  X,
  MessageCircle,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types.js';
import { signInWithGoogleAccount } from '../lib/googleAuth.js';

interface GoogleChatViewProps {
  userProfile: UserProfile;
  onUpdateUserProfile?: (profile: UserProfile) => void;
  darkMode?: boolean;
}

interface ChatSpace {
  name: string; // e.g. "spaces/AAAAAAAAAAA"
  type?: string; // "SPACE", "DIRECT_MESSAGE", "GROUP_CHAT"
  spaceType?: string;
  displayName?: string;
  singleUserBotDm?: boolean;
  threaded?: boolean;
  externalUserAllowed?: boolean;
}

interface ChatMessage {
  name: string; // e.g. "spaces/AAA/messages/BBB"
  sender?: {
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    type?: string;
  };
  createTime?: string;
  text?: string;
  formattedText?: string;
  thread?: {
    name?: string;
  };
}

interface ChatMember {
  name: string;
  state?: string;
  role?: string;
  member?: {
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    type?: string;
  };
}

export const GoogleChatView: React.FC<GoogleChatViewProps> = ({
  userProfile,
  onUpdateUserProfile,
  darkMode = false,
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(userProfile.accessToken || null);
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);

  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newMessageText, setNewMessageText] = useState('');
  const [spaceSearchQuery, setSpaceSearchQuery] = useState('');

  // Confirmation modals
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showCreateSpaceConfirm, setShowCreateSpaceConfirm] = useState(false);

  const [isSigningIn, setIsSigningIn] = useState(false);

  // Sync token from profile if available
  useEffect(() => {
    if (userProfile.accessToken) {
      setAccessToken(userProfile.accessToken);
    }
  }, [userProfile.accessToken]);

  // Load spaces when token is available
  useEffect(() => {
    if (accessToken) {
      fetchSpaces();
    }
  }, [accessToken]);

  // Load messages & members when space changes
  useEffect(() => {
    if (accessToken && selectedSpace) {
      fetchMessages(selectedSpace.name);
      fetchMembers(selectedSpace.name);
    } else {
      setMessages([]);
      setMembers([]);
    }
  }, [selectedSpace, accessToken]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setErrorMsg(null);
      const res = await signInWithGoogleAccount([
        'email',
        'profile',
        'https://www.googleapis.com/auth/chat.spaces.readonly',
        'https://www.googleapis.com/auth/chat.messages.readonly',
        'https://www.googleapis.com/auth/chat.messages.create',
      ]);
      if (res && res.accessToken) {
        setAccessToken(res.accessToken);
        if (onUpdateUserProfile) {
          onUpdateUserProfile({
            ...userProfile,
            accessToken: res.accessToken,
            name: res.displayName || userProfile.name,
            email: res.email || userProfile.email,
            avatar: res.photoURL || userProfile.avatar,
          });
        }
      } else if (res && res.userFriendlyMessage) {
        setErrorMsg(res.userFriendlyMessage);
      }
    } catch (err: any) {
      console.warn('Sign-in notice:', err);
      setErrorMsg('Google authentication was restricted by the browser environment. Please ensure popup blockers are disabled or open the app in a new tab.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const fetchSpaces = async () => {
    if (!accessToken) return;
    setLoadingSpaces(true);
    setErrorMsg(null);
    try {
      const res = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=100', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.status === 401) {
        setErrorMsg('Authentication token expired or insufficient permissions. Please re-authenticate with Google Chat scopes.');
        setAccessToken(null);
        return;
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch spaces');
      }

      const fetchedSpaces: ChatSpace[] = data.spaces || [];
      setSpaces(fetchedSpaces);
      if (fetchedSpaces.length > 0 && !selectedSpace) {
        setSelectedSpace(fetchedSpaces[0]);
      }
    } catch (err: any) {
      console.error('Fetch spaces error:', err);
      setErrorMsg(err.message || 'Unable to connect to Google Chat API.');
    } finally {
      setLoadingSpaces(false);
    }
  };

  const fetchMessages = async (spaceName: string) => {
    if (!accessToken) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=50`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchMembers = async (spaceName: string) => {
    if (!accessToken) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/members?pageSize=50`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (data.memberships) {
        setMembers(data.memberships);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('Fetch members error:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const executeSendMessage = async () => {
    if (!accessToken || !selectedSpace || !newMessageText.trim()) return;
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${selectedSpace.name}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newMessageText.trim(),
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      setNewMessageText('');
      setShowSendConfirm(false);
      // Refresh messages
      fetchMessages(selectedSpace.name);
    } catch (err: any) {
      console.error('Send message error:', err);
      setErrorMsg(`Failed to send message: ${err.message}`);
      setShowSendConfirm(false);
    }
  };

  const executeCreateSpace = async () => {
    if (!accessToken || !newSpaceName.trim()) return;
    try {
      const res = await fetch('https://chat.googleapis.com/v1/spaces', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceType: 'SPACE',
          displayName: newSpaceName.trim(),
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      setNewSpaceName('');
      setShowCreateSpaceConfirm(false);
      setShowCreateSpaceModal(false);
      // Refresh spaces & select new space
      await fetchSpaces();
      if (data.name) {
        setSelectedSpace(data);
      }
    } catch (err: any) {
      console.error('Create space error:', err);
      setErrorMsg(`Failed to create space: ${err.message}`);
      setShowCreateSpaceConfirm(false);
    }
  };

  const filteredSpaces = spaces.filter((s) => {
    const title = s.displayName || s.name;
    return title.toLowerCase().includes(spaceSearchQuery.toLowerCase());
  });

  return (
    <div className={`flex flex-col h-full w-full ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header Bar */}
      <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Google Chat Workspace</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-medium">
                Live API
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interact directly with your Google Workspace Chat spaces and team conversations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {accessToken && (
            <button
              onClick={() => {
                fetchSpaces();
                if (selectedSpace) {
                  fetchMessages(selectedSpace.name);
                  fetchMembers(selectedSpace.name);
                }
              }}
              disabled={loadingSpaces}
              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSpaces ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}

          {!accessToken && (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="gsi-material-button text-xs font-medium"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper flex items-center gap-2">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '18px', height: '18px' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      {!accessToken ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6 shadow-xl">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connect Google Chat</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Authorize your Google Workspace account to read spaces, send team messages, and manage direct communications directly inside LOGITIX AI Assistant.
          </p>

          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google Workspace'}</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Spaces List */}
          <div className={`w-80 border-r flex flex-col ${darkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-white'}`}>
            <div className="p-4 border-b border-inherit space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  <span>Your Spaces ({spaces.length})</span>
                </h3>
                <button
                  onClick={() => setShowCreateSpaceModal(true)}
                  className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                  title="Create new Google Chat Space"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search spaces..."
                  value={spaceSearchQuery}
                  onChange={(e) => setSpaceSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none transition-all ${
                    darkMode
                      ? 'bg-slate-800/80 border border-slate-700/60 text-white focus:border-cyan-500'
                      : 'bg-slate-100 border border-slate-200 text-slate-900 focus:border-cyan-500'
                  }`}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingSpaces && (
                <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Loading spaces...</span>
                </div>
              )}

              {!loadingSpaces && filteredSpaces.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  No spaces found. Create or join a space in Google Chat to get started.
                </div>
              )}

              {!loadingSpaces &&
                filteredSpaces.map((space) => {
                  const isSelected = selectedSpace?.name === space.name;
                  const isDm = space.spaceType === 'DIRECT_MESSAGE' || space.type === 'DIRECT_MESSAGE';
                  return (
                    <button
                      key={space.name}
                      onClick={() => setSelectedSpace(space)}
                      className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                        isSelected
                          ? darkMode
                            ? 'bg-cyan-500/15 border border-cyan-500/30 text-white shadow-sm'
                            : 'bg-cyan-50 border border-cyan-200 text-cyan-950 shadow-sm'
                          : darkMode
                          ? 'hover:bg-slate-800/50 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500 text-white' : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                        {isDm ? <MessageCircle className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {space.displayName || (isDm ? 'Direct Message' : space.name.split('/').pop())}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          {space.spaceType || space.type || 'SPACE'}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Right Area: Messages & Active Space */}
          <div className="flex-1 flex flex-col h-full bg-inherit overflow-hidden">
            {selectedSpace ? (
              <>
                {/* Active Space Header */}
                <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold">
                        {selectedSpace.displayName || selectedSpace.name.split('/').pop()}
                      </h2>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{selectedSpace.name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-cyan-400" /> {members.length} member(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchMessages(selectedSpace.name)}
                      disabled={loadingMessages}
                      className="p-2 rounded-xl border border-inherit hover:bg-slate-800/40 text-slate-400 text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="m-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{errorMsg}</span>
                    <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-rose-500/20 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingMessages && (
                    <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading space messages...</span>
                    </div>
                  )}

                  {!loadingMessages && messages.length === 0 && (
                    <div className="py-16 text-center text-xs text-slate-400 max-w-sm mx-auto">
                      <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-60" />
                      <p className="font-medium text-slate-300 mb-1">No messages yet in this space</p>
                      <p className="text-[11px] text-slate-500">Send the first message below to start the conversation.</p>
                    </div>
                  )}

                  {!loadingMessages &&
                    messages.map((msg) => {
                      const senderName = msg.sender?.displayName || msg.sender?.name?.split('/').pop() || 'User';
                      const isBot = msg.sender?.type === 'BOT';
                      const formattedTime = msg.createTime ? new Date(msg.createTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                      return (
                        <div
                          key={msg.name}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            darkMode
                              ? 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                              : 'bg-white border-slate-200 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                                {senderName}
                                {isBot && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-normal">
                                    BOT
                                  </span>
                                )}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formattedTime}
                            </span>
                          </div>

                          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {msg.text || msg.formattedText || '(Empty message)'}
                          </p>
                        </div>
                      );
                    })}
                </div>

                {/* Input Bar */}
                <div className={`p-4 border-t ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newMessageText.trim()) {
                        setShowSendConfirm(true);
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Message #${selectedSpace.displayName || selectedSpace.name.split('/').pop()}...`}
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      className={`flex-1 px-4 py-2.5 rounded-2xl text-xs focus:outline-none transition-all ${
                        darkMode
                          ? 'bg-slate-800/80 border border-slate-700 text-white focus:border-cyan-500'
                          : 'bg-slate-100 border border-slate-200 text-slate-900 focus:border-cyan-500'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!newMessageText.trim()}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-40 transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Hash className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-300">Select a space on the left</p>
                <p className="text-xs text-slate-500 mt-1">Choose a Google Chat space to view messages and join discussions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Sending Message */}
      {showSendConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center gap-3 mb-4 text-cyan-400">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Confirm Google Chat Message</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to dispatch this message to Google Chat space{' '}
              <strong className="text-cyan-400">"{selectedSpace?.displayName || selectedSpace?.name}"</strong>?
            </p>

            <div className={`p-3 rounded-2xl border text-xs italic mb-6 ${darkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
              "{newMessageText}"
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSendConfirm(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                  darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={executeSendMessage}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-semibold text-xs shadow-md shadow-cyan-500/20"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Space Modal */}
      {showCreateSpaceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>Create Google Chat Space</span>
              </h3>
              <button onClick={() => setShowCreateSpaceModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Space Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Project Alpha Standup"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none ${
                    darkMode ? 'bg-slate-800 border border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-100 border border-slate-200 text-slate-900 focus:border-cyan-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateSpaceModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                  darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newSpaceName.trim()) {
                    setShowCreateSpaceConfirm(true);
                  }
                }}
                disabled={!newSpaceName.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-40"
              >
                Create Space
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Creating Space */}
      {showCreateSpaceConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center gap-3 mb-4 text-cyan-400">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                <Hash className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Confirm New Space Creation</h3>
            </div>

            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to create a new Google Chat Space named{' '}
              <strong className="text-cyan-400">"{newSpaceName}"</strong> on your Google Workspace domain?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateSpaceConfirm(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                  darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={executeCreateSpace}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-semibold text-xs shadow-md shadow-cyan-500/20"
              >
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
