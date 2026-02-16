"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    MessageSquare,
    MoreHorizontal,
    Pencil,
    PlusCircle,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/lib/hooks/use-chat-sessions";

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

interface ChatSessionPanelProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onCreateSession: () => void;
    onSwitchSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    onRenameSession: (id: string, title: string) => void;
}

export function ChatSessionPanel({
    sessions,
    activeSessionId,
    onCreateSession,
    onSwitchSession,
    onDeleteSession,
    onRenameSession,
}: ChatSessionPanelProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");

    const startRename = (session: ChatSession) => {
        setEditingId(session.id);
        setEditTitle(session.title);
    };

    const commitRename = () => {
        if (editingId && editTitle.trim()) {
            onRenameSession(editingId, editTitle.trim());
        }
        setEditingId(null);
    };

    return (
        <div className="w-64 border-r flex flex-col bg-muted/20 shrink-0">
            <div className="p-3 border-b">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateSession}
                    className="w-full flex items-center gap-2"
                >
                    <PlusCircle className="h-4 w-4" />
                    New Chat
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={cn(
                                "group flex items-start gap-2 rounded-md px-2 py-2 text-sm cursor-pointer transition-colors",
                                session.id === activeSessionId
                                    ? "bg-accent text-accent-foreground"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => {
                                if (editingId !== session.id) {
                                    onSwitchSession(session.id);
                                }
                            }}
                        >
                            <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                {editingId === session.id ? (
                                    <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onBlur={commitRename}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") commitRename();
                                            if (e.key === "Escape") setEditingId(null);
                                        }}
                                        className="h-6 text-sm px-1 py-0"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <>
                                        <div className="break-words font-medium leading-snug">
                                            {session.title}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatRelativeTime(session.updatedAt)}
                                        </div>
                                    </>
                                )}
                            </div>
                            {editingId !== session.id && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" side="right">
                                        <DropdownMenuItem onClick={() => startRename(session)}>
                                            <Pencil className="h-4 w-4" />
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            variant="destructive"
                                            onClick={() => onDeleteSession(session.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            No chat sessions yet
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
