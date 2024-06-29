import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatWebSocketsService } from '@core/services/chat/chat-websockets.service';
import { ChatWebSocketResponse } from '@core/types/chat/chat.types';

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

  protected readonly messageLogs: {
    username: string;
    message: string;
    date: Date;
  }[] = [];

  protected readonly usernameLogs = signal<string[]>([]);

  public readonly onNewUserJoin = output<string[]>();

  private readonly _onNewUserJoinEffect = effect(() => {
    this.onNewUserJoin.emit(this.usernameLogs());
  });

  /**
   * The username associated with the comment.
   */
  public readonly ownUsername = input.required<string>();

  private hasAddedUser: boolean = false;

  onChatJoin = (data: ChatWebSocketResponse): void => {
    console.log('Chat Join', { data });

    if (this.hasAddedUser) {
      // * If we do not check this we will get an infinite loop
      return;
    }

    const { sender } = data;

    this.addNewUsernameLog(sender);

    this.chatWebSocketsService.setCurrentUser(this.ownUsername());
    this.chatWebSocketsService.addUser();
    this.hasAddedUser = true;
  };

  onChatNewMessage = (test: ChatWebSocketResponse): void => {
    console.log('onChatNewMessage', test);
  };

  onChatLeave = (test: ChatWebSocketResponse): void => {
    console.log('onChatLeave', test);
  };

  addNewUsernameLog = (newUsername: string): void => {
    this.usernameLogs.update((oldValues: string[]) => {
      return [...oldValues, newUsername];
    });
  };

  ngOnInit() {
    console.log('chatmodule ngOnInit');

    this.chatWebSocketsService.connect();

    this.addNewUsernameLog(this.ownUsername());

    this.chatWebSocketsService.setOnJoin(this.onChatJoin);

    this.chatWebSocketsService.setOnChatMessage(this.onChatNewMessage);
    this.chatWebSocketsService.setOnLeave(this.onChatLeave);
  }

  ngOnDestroy() {
    this.chatWebSocketsService.disconnect();
  }

  onSubmit = (event: Event): void => {
    event.preventDefault();

    const formValues = this.sendMessageForm.value;
    console.log('Form Values:', formValues);

    const { message } = formValues;

    this.chatWebSocketsService.sendMessage(this.ownUsername(), message!);
  };
}
