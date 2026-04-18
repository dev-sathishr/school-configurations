import { Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { environment } from 'src/environments/environment';

interface ChatUser {
  id: string;
  full_name: string;
  username: string;
  profile_file_id?: string | null;
  is_online?: boolean;
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
  is_online?: boolean;
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
  isOpen = signal(false);
  view = signal<'list' | 'chat'>('list');
  unreadTotal = signal(0);

  // User list
  users = signal<ChatUser[]>([]);
  conversations = signal<Conversation[]>([]);
  searchQuery = signal('');

  // Chat view
  activeConversation: Conversation | null = null;
  activeConversationId = '';
  activeChatUserId = signal<string | null>(null);
  activeChatName = signal('');
  activeChatProfileFileId = signal<string | null>(null);
  messages = signal<Message[]>([]);
  avatarErrors = signal<Set<string>>(new Set());
  newMessage = '';
  sending = signal(false);
  currentUserId = '';
  onlineUserIds = signal<Set<string>>(new Set());

  filteredConversations = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const convs = this.conversations();
    if (!q) return convs;
    return convs.filter(c => (c.other_user_name || '').toLowerCase().includes(q));
  });

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return [];
    const existingIds = new Set(this.conversations().map(c => c.other_user_id));
    return this.users().filter(u => !existingIds.has(u.id) && (u.full_name || '').toLowerCase().includes(q));
  });

  showEmptyState = computed(() => this.filteredConversations().length === 0 && this.filteredUsers().length === 0);

  emptyStateMessage = computed(() => this.searchQuery() ? 'No users found' : 'No conversations yet. Search a user to start chatting.');

  private eventSource?: EventSource;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  constructor(
    private cs: CommonService,
    private authService: AuthService,
    private ngZone: NgZone,
    private elRef: ElementRef,
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
        this.unreadTotal.set(res.unread_total || 0);
      },
    });
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggle(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.view.set('list');
      this.loadConversations();
    }
  }

  // --- List view ---

  loadConversations(): void {
    this.cs.getService({ url: '/chat/conversations' }).subscribe({
      next: (res: any) => {
        const convs = res.conversations || [];
        this.conversations.set(convs);
        this.unreadTotal.set(res.unread_total || 0);
        this.mergeOnline(convs, 'other_user_id');
      },
    });
  }

  loadUsers(): void {
    if (this.users().length > 0) return;
    this.cs.getService({ url: '/chat/users' }).subscribe({
      next: (res: any) => {
        const users = res.users || [];
        this.users.set(users);
        this.mergeOnline(users, 'id');
      },
    });
  }

  private mergeOnline(items: any[], idKey: string): void {
    const onlineIds = items.filter(i => i.is_online).map(i => i[idKey]);
    if (onlineIds.length === 0) return;
    this.onlineUserIds.update(set => {
      const next = new Set(set);
      onlineIds.forEach(id => next.add(id));
      return next;
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.loadUsers();
  }

  openConversation(conv: Conversation): void {
    this.activeConversation = conv;
    this.activeConversationId = conv.id;
    this.activeChatUserId.set(conv.other_user_id);
    this.activeChatName.set(conv.other_user_name);
    this.activeChatProfileFileId.set(conv.other_user_profile_file_id || null);
    this.view.set('chat');
    this.messages.set([]);
    this.loadMessages();
  }

  startNewChat(user: ChatUser): void {
    this.cs.postService({ url: '/chat/conversations', payload: { user_id: user.id } }).subscribe({
      next: (res: any) => {
        this.activeConversationId = res.conversation_id;
        this.activeChatUserId.set(user.id);
        this.activeChatName.set(user.full_name);
        this.activeChatProfileFileId.set(user.profile_file_id || null);
        this.activeConversation = null;
        this.view.set('chat');
        this.messages.set([]);
        this.searchQuery.set('');
        this.loadMessages();
      },
    });
  }

  // --- Chat view ---

  goBack(): void {
    this.view.set('list');
    this.loadConversations();
  }

  loadMessages(): void {
    this.cs.getService({ url: `/chat/conversations/${this.activeConversationId}/messages` }).subscribe({
      next: (res: any) => {
        this.messages.set(res.messages || []);
        this.scrollToBottom();
      },
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.sending()) return;
    this.sending.set(true);
    this.cs.postService({
      url: `/chat/conversations/${this.activeConversationId}/messages`,
      payload: { content: this.newMessage.trim() },
    }).subscribe({
      next: (res: any) => {
        this.messages.update(list => [...list, res.message]);
        this.newMessage = '';
        this.sending.set(false);
        this.scrollToBottom();
      },
      error: () => { this.sending.set(false); },
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

      this.eventSource.addEventListener('presence_snapshot', (event: any) => {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          this.onlineUserIds.set(new Set<string>(data.online_user_ids || []));
        });
      });

      this.eventSource.addEventListener('presence_change', (event: any) => {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          this.onlineUserIds.update(set => {
            const next = new Set(set);
            if (data.is_online) next.add(data.user_id);
            else next.delete(data.user_id);
            return next;
          });
        });
      });

      this.eventSource.addEventListener('chat_message', (event: any) => {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          this.unreadTotal.set(data.unread_total || 0);

          // If currently viewing this conversation, add message
          if (this.isOpen() && this.view() === 'chat' && data.conversation_id === this.activeConversationId) {
            this.messages.update(list => [...list, data.message]);
            this.scrollToBottom();
            // Mark as read
            this.cs.putService({ url: `/chat/conversations/${this.activeConversationId}/read`, payload: {} }).subscribe(() => {
              this.unreadTotal.update(v => Math.max(0, v - 1));
            });
          }

          // Update conversation list if open
          if (this.isOpen() && this.view() === 'list') {
            this.loadConversations();
          }
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

  isOnline(userId: string | null | undefined): boolean {
    return !!userId && this.onlineUserIds().has(userId);
  }

  getAvatarUrl(fileId: string | null | undefined): string | null {
    if (!fileId || this.avatarErrors().has(fileId)) return null;
    const token = this.authService.getToken();
    return `${environment.apiUrl}/files/${fileId}?token=${token}`;
  }

  onAvatarError(fileId: string | null | undefined): void {
    if (fileId) {
      this.avatarErrors.update(set => {
        const next = new Set(set);
        next.add(fileId);
        return next;
      });
    }
  }
}
