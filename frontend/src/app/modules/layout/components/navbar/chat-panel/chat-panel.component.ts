import { ApplicationRef, ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { environment } from 'src/environments/environment';

interface ChatUser {
  id: string;
  full_name: string;
  username: string;
  profile_file_id?: string | null;
}

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_username: string;
  other_user_profile_file_id?: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
}

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat-panel.component.html',
})
export class ChatPanelComponent implements OnInit, OnDestroy {
  isOpen = false;
  view: 'list' | 'chat' = 'list';
  unreadTotal = 0;

  // User list
  users: ChatUser[] = [];
  conversations: Conversation[] = [];
  searchQuery = '';

  // Chat view
  activeConversation: Conversation | null = null;
  activeConversationId = '';
  activeChatName = '';
  activeChatProfileFileId: string | null = null;
  messages: Message[] = [];
  avatarErrors = new Set<string>();
  newMessage = '';
  sending = false;
  currentUserId = '';

  private eventSource?: EventSource;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  constructor(
    private cs: CommonService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private elRef: ElementRef,
    private appRef: ApplicationRef,
  ) {
    this.currentUserId = this.authService.currentUser?.id || '';
  }

  ngOnInit(): void {
    this.loadUnreadCount();
    this.connectSSE();
  }

  private loadUnreadCount(): void {
    this.cs.getService({ url: '/chat/unread-count' }).subscribe({
      next: (res: any) => {
        this.unreadTotal = res.unread_total || 0;
        this.appRef.tick();
      },
    });
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.cdr.detectChanges();
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.view = 'list';
      this.loadConversations();
    }
  }

  // --- List view ---

  loadConversations(): void {
    this.cs.getService({ url: '/chat/conversations' }).subscribe({
      next: (res: any) => {
        this.conversations = res.conversations || [];
        this.unreadTotal = res.unread_total || 0;
        this.appRef.tick();
      },
    });
  }

  loadUsers(): void {
    if (this.users.length > 0) return;
    this.cs.getService({ url: '/chat/users' }).subscribe({
      next: (res: any) => {
        this.users = res.users || [];
        this.cdr.detectChanges();
      },
    });
  }

  get filteredConversations(): Conversation[] {
    if (!this.searchQuery) return this.conversations;
    const q = this.searchQuery.toLowerCase();
    return this.conversations.filter(c => c.other_user_name.toLowerCase().includes(q));
  }

  get filteredUsers(): ChatUser[] {
    if (!this.searchQuery) return [];
    const q = this.searchQuery.toLowerCase();
    const existingIds = new Set(this.conversations.map(c => c.other_user_id));
    return this.users.filter(u => !existingIds.has(u.id) && u.full_name.toLowerCase().includes(q));
  }

  openConversation(conv: Conversation): void {
    this.activeConversation = conv;
    this.activeConversationId = conv.id;
    this.activeChatName = conv.other_user_name;
    this.activeChatProfileFileId = conv.other_user_profile_file_id || null;
    this.view = 'chat';
    this.messages = [];
    this.loadMessages();
  }

  startNewChat(user: ChatUser): void {
    this.cs.postService({ url: '/chat/conversations', payload: { user_id: user.id } }).subscribe({
      next: (res: any) => {
        this.activeConversationId = res.conversation_id;
        this.activeChatName = user.full_name;
        this.activeChatProfileFileId = user.profile_file_id || null;
        this.activeConversation = null;
        this.view = 'chat';
        this.messages = [];
        this.searchQuery = '';
        this.loadMessages();
        this.cdr.detectChanges();
      },
    });
  }

  // --- Chat view ---

  goBack(): void {
    this.view = 'list';
    this.loadConversations();
  }

  loadMessages(): void {
    this.cs.getService({ url: `/chat/conversations/${this.activeConversationId}/messages` }).subscribe({
      next: (res: any) => {
        this.messages = res.messages || [];
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.sending) return;
    this.sending = true;
    this.cs.postService({
      url: `/chat/conversations/${this.activeConversationId}/messages`,
      payload: { content: this.newMessage.trim() },
    }).subscribe({
      next: (res: any) => {
        this.messages.push(res.message);
        this.newMessage = '';
        this.sending = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: () => { this.sending = false; this.cdr.detectChanges(); },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // --- SSE ---

  private connectSSE(): void {
    const token = this.authService.getToken();
    if (!token) return;

    const url = `${environment.apiUrl}/notifications/stream?token=${token}`;

    this.ngZone.runOutsideAngular(() => {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('chat_message', (event: any) => {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          this.unreadTotal = data.unread_total || 0;

          // If currently viewing this conversation, add message
          if (this.isOpen && this.view === 'chat' && data.conversation_id === this.activeConversationId) {
            this.messages = [...this.messages, data.message];
            this.scrollToBottom();
            // Mark as read
            this.cs.putService({ url: `/chat/conversations/${this.activeConversationId}/read`, payload: {} }).subscribe(() => {
              this.unreadTotal = Math.max(0, this.unreadTotal - 1);
              this.appRef.tick();
            });
          }

          // Update conversation list if open
          if (this.isOpen && this.view === 'list') {
            this.loadConversations();
          }

          this.appRef.tick();
        });
      });

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        setTimeout(() => this.connectSSE(), 5000);
      };
    });
  }

  // --- Helpers ---

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  messageTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getAvatarUrl(fileId: string | null | undefined): string | null {
    if (!fileId || this.avatarErrors.has(fileId)) return null;
    const token = this.authService.getToken();
    return `${environment.apiUrl}/files/${fileId}?token=${token}`;
  }

  onAvatarError(fileId: string | null | undefined): void {
    if (fileId) {
      this.avatarErrors.add(fileId);
      this.cdr.detectChanges();
    }
  }
}
