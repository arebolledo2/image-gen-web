"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { FileUIPart } from "ai";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, PanelLeftClose, PanelLeft, PlusCircle } from "lucide-react";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ChatSessionPanel } from "./chat-session-panel";
import { ChatImagePreviewPane } from "./chat-image-preview-pane";
import { ImageGalleryModal, type GalleryImage } from "@/components/image-gallery-modal";
import { useChatHistory } from "@/lib/hooks/use-chat-history";
import { useChatSessions } from "@/lib/hooks/use-chat-sessions";
import type { GetImagesPreviewData } from "./chat-tool-utils";

const EMPTY_VERSION_MAP: Record<string, string> = {};
const EMPTY_ANIMATIONS_MAP: Record<string, never[]> = {};

interface PreviewPaneState {
    sessionId: string | null;
    isOpen: boolean;
    data: GetImagesPreviewData | null;
    selectedIndex: number | null;
}

export function ChatInterface() {
    const {
        sessions,
        activeSessionId,
        isPanelOpen,
        isLoaded: sessionsLoaded,
        createSession,
        deleteSession,
        switchSession,
        renameSession,
        updateSessionTimestamp,
        togglePanel,
    } = useChatSessions();

    const {
        initialMessages,
        isLoaded: historyLoaded,
        saveMessages,
    } = useChatHistory(activeSessionId ?? "default");

    const { messages, sendMessage, status, setMessages, addToolApprovalResponse } = useChat({
        id: activeSessionId ?? "default",
        messages: initialMessages,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });
    const [previewPaneState, setPreviewPaneState] = useState<PreviewPaneState>({
        sessionId: activeSessionId ?? null,
        isOpen: false,
        data: null,
        selectedIndex: null,
    });

    const isLoaded = sessionsLoaded && historyLoaded;

    // When session changes, sync messages from localStorage
    const prevSessionRef = useRef(activeSessionId);
    useEffect(() => {
        if (prevSessionRef.current !== activeSessionId) {
            prevSessionRef.current = activeSessionId;
            setMessages(initialMessages);
        }
    }, [activeSessionId, initialMessages, setMessages]);

    // Save messages to history whenever they change
    useEffect(() => {
        if (isLoaded && messages.length > 0 && activeSessionId) {
            saveMessages(messages);
            updateSessionTimestamp(activeSessionId);
        }
    }, [messages, isLoaded, saveMessages, activeSessionId, updateSessionTimestamp]);

    const handleSendMessage = (content: { text: string; files: { url: string; mediaType?: string; filename?: string }[] }) => {
        const hasText = content.text.trim().length > 0;
        const hasFiles = content.files.length > 0;

        if (!hasText && !hasFiles) {
            return;
        }

        // Auto-title: set session title from the first message sent in a "New Chat"
        if (activeSessionId) {
            const session = sessions.find(s => s.id === activeSessionId);
            if (session && session.title === "New Chat" && hasText) {
                const title = content.text.slice(0, 50) + (content.text.length > 50 ? "..." : "");
                renameSession(activeSessionId, title);
            }
        }

        const files: FileUIPart[] = content.files.map((file) => ({
            url: file.url,
            mediaType: file.mediaType ?? "application/octet-stream",
            filename: file.filename,
            type: "file",
        }));

        if (hasText && hasFiles) {
            sendMessage({ text: content.text, files });
            return;
        }

        if (hasText) {
            sendMessage({ text: content.text });
            return;
        }

        sendMessage({ files });
    };

    const handleNewSession = () => {
        createSession();
        setMessages([]);
    };

    const handleSwitchSession = (id: string) => {
        if (id === activeSessionId) return;
        switchSession(id);
    };

    const isLoading = status !== "ready";
    const isPreviewForActiveSession = previewPaneState.sessionId === (activeSessionId ?? null);
    const isPreviewPaneOpen = isPreviewForActiveSession && previewPaneState.isOpen;
    const previewData = isPreviewForActiveSession ? previewPaneState.data : null;
    const selectedPreviewImageIndex = isPreviewForActiveSession ? previewPaneState.selectedIndex : null;
    const previewImages = useMemo(() => previewData?.images ?? [], [previewData]);

    const previewGalleryImages = useMemo<GalleryImage[]>(() => {
        return previewImages.map((image) => {
            const hasBatchMetadata = Boolean(image.batchId || image.batch);

            return {
                id: image.id,
                filePath: image.filePath ?? "",
                fileName: image.fileName ?? `${image.id}.png`,
                mediaType: "image/png",
                isFavorite: image.isFavorite ?? false,
                transparentFilePath: null,
                flippedFilePath: null,
                createdAt: image.createdAt ?? new Date(0).toISOString(),
                generation: {
                    batch: hasBatchMetadata
                        ? {
                            id: image.batchId ?? `chat-batch-${image.id}`,
                            name: image.batch ?? "Unknown Batch",
                        }
                        : null,
                    batchPrompt: image.prompt
                        ? {
                            id: `chat-prompt-${image.id}`,
                            promptText: image.prompt,
                        }
                        : null,
                },
            };
        });
    }, [previewImages]);

    const safeSelectedPreviewImageIndex =
        selectedPreviewImageIndex !== null && selectedPreviewImageIndex < previewGalleryImages.length
            ? selectedPreviewImageIndex
            : null;

    const handleClosePreviewPane = useCallback(() => {
        setPreviewPaneState((prevState) => ({
            ...prevState,
            isOpen: false,
            selectedIndex: null,
        }));
    }, []);

    const handleOpenGetImagesPreview = useCallback((data: GetImagesPreviewData) => {
        setPreviewPaneState({
            sessionId: activeSessionId ?? null,
            isOpen: true,
            data,
            selectedIndex: null,
        });
    }, [activeSessionId]);

    return (
        <Card className="relative flex h-[calc(100vh-130px)] flex-row overflow-hidden border-none bg-background/50 shadow-lg backdrop-blur-md">
            {isPanelOpen && (
                <ChatSessionPanel
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onCreateSession={handleNewSession}
                    onSwitchSession={handleSwitchSession}
                    onDeleteSession={deleteSession}
                    onRenameSession={renameSession}
                />
            )}
            <div className="flex flex-col flex-1 min-w-0">
                <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={togglePanel}
                                className="h-8 w-8 p-0"
                                title={isPanelOpen ? "Hide history" : "Show history"}
                            >
                                {isPanelOpen ? (
                                    <PanelLeftClose className="h-4 w-4" />
                                ) : (
                                    <PanelLeft className="h-4 w-4" />
                                )}
                            </Button>
                            <div>
                                <h2 className="font-semibold flex items-center gap-2">
                                    <History className="h-5 w-5" /> Agentic Chat
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Orchestrate your game asset workflow with AI.
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNewSession}
                            className="flex items-center gap-2"
                        >
                            <PlusCircle className="h-4 w-4" />
                            New Session
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <ChatMessages
                        messages={messages}
                        addToolApprovalResponse={addToolApprovalResponse}
                        onOpenGetImagesPreview={handleOpenGetImagesPreview}
                    />
                </div>

                <div className="p-4 bg-transparent">
                    <ChatInput
                        onSubmit={handleSendMessage}
                        status={status}
                        isLoading={isLoading}
                    />
                </div>
            </div>
            {isPreviewPaneOpen && (
                <div className="hidden w-96 shrink-0 border-l lg:block">
                    <ChatImagePreviewPane
                        images={previewImages}
                        onClose={handleClosePreviewPane}
                        onSelectImage={(index) => setPreviewPaneState((prevState) => ({
                            ...prevState,
                            selectedIndex: index,
                        }))}
                    />
                </div>
            )}
            {isPreviewPaneOpen && (
                <div className="absolute inset-0 z-20 border-l bg-background lg:hidden">
                    <ChatImagePreviewPane
                        images={previewImages}
                        onClose={handleClosePreviewPane}
                        onSelectImage={(index) => setPreviewPaneState((prevState) => ({
                            ...prevState,
                            selectedIndex: index,
                        }))}
                    />
                </div>
            )}
            <ImageGalleryModal
                images={previewGalleryImages}
                selectedIndex={safeSelectedPreviewImageIndex}
                onClose={() => setPreviewPaneState((prevState) => ({
                    ...prevState,
                    selectedIndex: null,
                }))}
                onNavigate={(index) => setPreviewPaneState((prevState) => ({
                    ...prevState,
                    selectedIndex: index,
                }))}
                selectedVersion={EMPTY_VERSION_MAP}
                onSelectedVersionChange={() => undefined}
                squishAnimations={EMPTY_ANIMATIONS_MAP}
                aiAnimations={EMPTY_ANIMATIONS_MAP}
                readOnly
            />
        </Card>
    );
}
