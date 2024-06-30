import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatWebSocketsService } from '@core/services/chat/chat-websockets.service';
import {
  ChatLogMessage,
  ChatWebSocketResponse,
} from '@core/types/chat/chat.types';

@Component({
  selector: 'app-chat-module',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './chat-module.component.html',
  styleUrl: './chat-module.component.scss',
})
export class ChatModuleComponent {
  /**
   * Form builder service for creating reactive forms.
   */
  private readonly formBuilder = inject(FormBuilder);

  protected readonly sendMessageForm = this.formBuilder.group({
    message: ['', [Validators.required]],
  });

  protected readonly chatWebSocketsService = inject(ChatWebSocketsService);

  protected readonly messageLogs = signal<ChatLogMessage[]>([]);

  /**
   * The username associated with the comment.
   */
  public readonly ownUsername = input.required<string>();

  ngOnInit() {
    console.log('chatmodule ngOnInit');

    this.chatWebSocketsService.connect();

    this.chatWebSocketsService.setOnJoin(this.onChatJoin);
    this.chatWebSocketsService.setOnChatConnection(this.onChatConnection);

    this.chatWebSocketsService.setOnChatMessage(this.onChatNewMessage);
    this.chatWebSocketsService.setOnLeave(this.onChatLeave);
  }

  ngOnDestroy() {
    this.chatWebSocketsService.disconnect();
  }

  onChatConnection = (): void => {
    console.log('onChatCOnnection');

    this.chatWebSocketsService.setCurrentUser(this.ownUsername());
    this.chatWebSocketsService.addUser();
  };

  onChatJoin = (data: ChatWebSocketResponse): void => {
    this.addNewMessageLog({ ...data, type: 'JOIN' });
  };

  onChatNewMessage = (data: ChatWebSocketResponse): void => {
    console.log('onChatNewMessage', data);

    this.addNewMessageLog({ ...data, type: 'CHAT' });
  };

  onChatLeave = (data: ChatWebSocketResponse): void => {
    console.log('onChatLeave', data);

    this.addNewMessageLog({ ...data, type: 'LEAVE' });
  };

  addNewMessageLog = (newMessage: ChatLogMessage): void => {
    this.messageLogs.update((oldValues: ChatLogMessage[]) => {
      return [...oldValues, newMessage];
    });
  };

  onSubmit = (event: Event): void => {
    event.preventDefault();

    const formValues = this.sendMessageForm.value;
    console.log('Form Values:', formValues);

    const { message } = formValues;

    this.chatWebSocketsService.sendMessage(this.ownUsername(), message!);
    this.resetForm();
  };

  /**
   * Resets the chat form input.
   */
  private resetForm = () => {
    this.sendMessageForm.setValue({
      message: '',
    });
  };
}
