"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Loader2,
  Send,
  ArrowLeft,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";

interface Conversation {
  id: string;
  event_id: string;
  last_message_at: string | null;
  other_person: {
    participant_id: string;
    full_name: string;
    avatar_url: string | null;
    title: string | null;
    company_name: string | null;
  };
  last_message?: string;
}

interface Message {
  id: string;
  content: string;
  content_type: string;
  sender_id: string;
  created_at: string;
  is_mine: boolean;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const toParticipantId = searchParams.get('to');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [myParticipantIds, setMyParticipantIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle ?to= query param to start conversation
  useEffect(() => {
    console.log('Messages page - toParticipantId:', toParticipantId, 'conversations:', conversations.length, 'myParticipantIds:', myParticipantIds.length);
    
    if (!toParticipantId || conversations.length === 0 || !myParticipantIds.length) return;
    
    console.log('Looking for existing conversation with participant:', toParticipantId);
    
    // Find existing conversation with this participant
    const existingConvo = conversations.find(c => 
      c.other_person.participant_id === toParticipantId
    );
    
    if (existingConvo) {
      console.log('Found existing conversation:', existingConvo.id);
      setSelectedConvo(existingConvo.id);
      loadMessages(existingConvo.id);
    } else {
      console.log('Creating new conversation with:', toParticipantId);
      // Create new conversation
      createConversationWith(toParticipantId);
    }
  }, [conversations, toParticipantId, myParticipantIds]);

  async function createConversationWith(participantId: string) {
    console.log('Creating conversation with participant ID:', participantId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user found');
      return;
    }

    // Get my participant record for the same event as the target participant
    const { data: targetParticipant, error: targetError } = await supabase
      .from("participants")
      .select("event_id, profiles!inner(full_name, avatar_url, title, company_name)")
      .eq("id", participantId)
      .single();
    
    console.log('Target participant query:', { targetParticipant, targetError });
    if (!targetParticipant) return;

    const { data: myParticipant, error: myError } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", targetParticipant.event_id)
      .eq("user_id", user.id)
      .single();

    console.log('My participant query:', { myParticipant, myError });
    if (!myParticipant) return;

    // Create conversation
    const { data: newConvo } = await supabase
      .from("conversations")
      .insert({
        event_id: targetParticipant.event_id,
        participant_a_id: myParticipant.id,
        participant_b_id: participantId
      })
      .select("id")
      .single();

    if (newConvo) {
      // Add to conversations list
      const newConversation: Conversation = {
        id: newConvo.id,
        event_id: targetParticipant.event_id,
        last_message_at: null,
        other_person: {
          participant_id: participantId,
          full_name: targetParticipant.profiles[0].full_name,
          avatar_url: targetParticipant.profiles[0].avatar_url,
          title: targetParticipant.profiles[0].title,
          company_name: targetParticipant.profiles[0].company_name,
        }
      };
      
      setConversations(prev => [newConversation, ...prev]);
      setSelectedConvo(newConvo.id);
      setMessages([]);
    }
  }

  async function loadConversations() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: myParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("user_id", user.id);

    if (!myParticipants) { setLoading(false); return; }

    const ids = myParticipants.map((p) => p.id);
    setMyParticipantIds(ids);

    const { data: convosA } = await supabase
      .from("conversations")
      .select(`
        id, event_id, last_message_at,
        participant_b:participants!conversations_participant_b_id_fkey(
          id, profiles!inner(full_name, avatar_url, title, company_name)
        )
      `)
      .in("participant_a_id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    const { data: convosB } = await supabase
      .from("conversations")
      .select(`
        id, event_id, last_message_at,
        participant_a:participants!conversations_participant_a_id_fkey(
          id, profiles!inner(full_name, avatar_url, title, company_name)
        )
      `)
      .in("participant_b_id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    const combined: Conversation[] = [
      ...(convosA || []).map((c: any) => ({
        id: c.id,
        event_id: c.event_id,
        last_message_at: c.last_message_at,
        other_person: {
          participant_id: c.participant_b?.id,
          ...c.participant_b?.profiles,
        },
      })),
      ...(convosB || []).map((c: any) => ({
        id: c.id,
        event_id: c.event_id,
        last_message_at: c.last_message_at,
        other_person: {
          participant_id: c.participant_a?.id,
          ...c.participant_a?.profiles,
        },
      })),
    ].sort((a, b) => {
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    setConversations(combined);
    setLoading(false);
  }

  const loadMessages = useCallback(async (convoId: string) => {
    setLoadingMessages(true);
    const supabase = createClient();

    const { data } = await supabase
      .from("messages")
      .select("id, content, content_type, sender_id, created_at, file_url, file_name, file_size, file_type")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(
        data.map((m) => ({
          ...m,
          is_mine: myParticipantIds.includes(m.sender_id),
        }))
      );
    }
    setLoadingMessages(false);
  }, [myParticipantIds]);

  useEffect(() => {
    if (!selectedConvo) return;
    loadMessages(selectedConvo);

    // Subscribe to new messages
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${selectedConvo}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConvo}`,
        },
        (payload) => {
          const msg = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              ...msg,
              is_mine: myParticipantIds.includes(msg.sender_id),
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvo, loadMessages, myParticipantIds]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvo || myParticipantIds.length === 0) return;

    setSending(true);
    const supabase = createClient();

    // Find which participant ID to use for this conversation
    const convo = conversations.find((c) => c.id === selectedConvo);
    const senderId = myParticipantIds[0]; // Use first available

    await supabase.from("messages").insert({
      conversation_id: selectedConvo,
      sender_id: senderId,
      content: newMessage.trim(),
      content_type: "text",
    });

    // Update last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", selectedConvo);

    setNewMessage("");
    setSending(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedConvo || myParticipantIds.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", selectedConvo);
    formData.append("senderId", myParticipantIds[0]);

    await fetch("/api/messages/upload", { method: "POST", body: formData });

    // Update last_message_at
    const supabase = createClient();
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", selectedConvo);

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConvo);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-h1 font-semibold tracking-tight">Messages</h1>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
        {/* Conversation List */}
        <div className={`w-80 shrink-0 border border-border rounded-lg overflow-hidden flex flex-col ${selectedConvo ? "hidden lg:flex" : "flex"}`}>
          <div className="p-3 border-b border-border">
            <p className="text-caption font-medium text-muted-foreground">
              {conversations.length} conversations
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-caption text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              conversations.map((convo) => {
                const other = convo.other_person;
                const initials = (other.full_name || "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <button
                    key={convo.id}
                    onClick={() => setSelectedConvo(convo.id)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors duration-150 ${
                      selectedConvo === convo.id
                        ? "bg-primary/5"
                        : "hover:bg-secondary"
                    }`}
                  >
                    {other.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={other.avatar_url} alt={other.full_name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium truncate">{other.full_name}</p>
                      <p className="text-caption text-muted-foreground truncate">
                        {other.title || other.company_name || "Participant"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 border border-border rounded-lg overflow-hidden flex flex-col ${!selectedConvo ? "hidden lg:flex" : "flex"}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <button
                  onClick={() => setSelectedConvo(null)}
                  className="lg:hidden flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-body font-medium">{selectedConversation.other_person.full_name}</p>
                  <p className="text-caption text-muted-foreground">
                    {[selectedConversation.other_person.title, selectedConversation.other_person.company_name]
                      .filter(Boolean)
                      .join(" at ")}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-caption text-muted-foreground">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2.5 ${
                          msg.is_mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface border border-border text-foreground"
                        }`}
                      >
                        {msg.file_url && msg.file_type?.startsWith("image/") ? (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={msg.file_url} alt={msg.file_name || "Image"} className="max-w-full rounded-md max-h-64 object-cover mb-1" />
                          </a>
                        ) : msg.file_url ? (
                          <a
                            href={msg.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 mb-1 ${msg.is_mine ? "text-primary-foreground" : "text-foreground"}`}
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="text-sm underline truncate">{msg.file_name || "File"}</span>
                            {msg.file_size && (
                              <span className="text-xs opacity-60 shrink-0">
                                {(msg.file_size / 1024).toFixed(0)}KB
                              </span>
                            )}
                            <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          </a>
                        ) : null}
                        {(!msg.file_url || msg.content_type === "text") && (
                          <p className="text-body">{msg.content}</p>
                        )}
                        <p className={`text-small mt-1 ${msg.is_mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim() || sending} size="icon">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageSquare className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">Select a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
