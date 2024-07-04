import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatWebSocketsService } from '@core/services/chat/chat-websockets.service';
import {
  ChatLogMessage,
  ChatWebSocketJoinLeaveResponse,
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

  /**
   * The reactive form for sending a chat message.
   */
  protected readonly sendMessageForm = this.formBuilder.group({
    message: ['', [Validators.required]],
  });

  /**
   * The ChatWebSocketsService instance.
   */
  protected readonly chatWebSocketsService = inject(ChatWebSocketsService);

  /**
   * The array of chat log messages.
   */
  protected readonly messageLogs = signal<ChatLogMessage[]>([]);

  /**
   * The username associated with the comment.
   */
  public readonly ownUsername = input.required<string>();

  ngOnInit() {
    console.log('chatmodule ngOnInit');

    this.connectToWebSocket();
  }

  ngOnDestroy() {
    this.disconnectFromWebSocket();
  }

  /**
   * Connects to the WebSocket service and sets up event listeners for various chat events.
   */
  private connectToWebSocket = (): void => {
    this.chatWebSocketsService.connect();

    // * Set the event listeners callbacks
    this.chatWebSocketsService.setOnChatConnection(this.notifyOwnConnection);
    this.chatWebSocketsService.setOnJoin(this.onChatNewMemberJoin);
    this.chatWebSocketsService.setOnChatMessage(this.onChatNewMessage);
    this.chatWebSocketsService.setOnLeave(this.onChatMemberLeave);
  };

  /**
   * Disconnects from the WebSocket service.
   */
  private disconnectFromWebSocket = (): void => {
    this.chatWebSocketsService.disconnect();
  };

  /**
   * Notifies the WebSocket service of the current user's connection and adds the user to the chat.
   */
  notifyOwnConnection = (): void => {
    /**
     * Sets the current user in the WebSocket service.
     * @param {string} username - The username of the current user.
     */
    this.chatWebSocketsService.setCurrentUser(this.ownUsername());

    /**
     * Adds the current user to the chat.
     */
    this.chatWebSocketsService.addUser();
  };

  /**
   * Adds a new chat message log for a new member join event.
   * @param {ChatWebSocketResponse} data - The data of the new member join event.
   */
  onChatNewMemberJoin = (data: ChatWebSocketJoinLeaveResponse): void => {
    this.addNewMessageLog({
      type: 'JOIN',
      sender: data.sender,
      date: new Date(),
      message: '',
    });
  };

  /**
   * Adds a new chat message log for a new chat message event.
   * @param {ChatWebSocketResponse} data - The data of the new chat message event.
   */
  onChatNewMessage = (data: ChatWebSocketResponse): void => {
    console.log('onChatNewMessage', data);

    this.addNewMessageLog({ ...data, type: 'CHAT' });
  };

  /**
   * Adds a new chat message log for a chat member leave event.
   * @param {ChatWebSocketResponse} data - The data of the chat member leave event.
   */
  onChatMemberLeave = (data: ChatWebSocketJoinLeaveResponse): void => {
    console.log('onChatLeave', data);

    this.addNewMessageLog({
      type: 'LEAVE',
      sender: data.sender,
      date: new Date(),
      message: '',
    });
  };

  /**
   * Adds a new chat message log.
   * @param {ChatLogMessage} newMessage - The new message to add.
   * @returns {void}
   */
  addNewMessageLog = (newMessage: ChatLogMessage): void => {
    this.messageLogs.update((oldValues: ChatLogMessage[]) => {
      return [...oldValues, newMessage];
    });
  };

  /**
   * Submits a message to the chat if the "`Ctrl` + `Enter`" shortcut is used.
   * @param {KeyboardEvent} event - The keyboard event.
   * @returns {void}
   */
  submitMessageWithShortcut = (event: KeyboardEvent): void => {
    const { ctrlKey, key } = event;

    const usedShortcut: boolean = ctrlKey && key === 'Enter';
    if (!usedShortcut) {
      return;
    }

    this.onSubmitMessageToChat(event);
  };

  /**
   * Submits a message to the chat.
   *
   * @param {Event} event - The form submit event.
   * @returns {void}
   */
  onSubmitMessageToChat = (event: Event): void => {
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
