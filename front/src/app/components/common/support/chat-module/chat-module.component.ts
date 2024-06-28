import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatWebSocketsService } from '@core/services/chat/chat-websockets.service';

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

  /**
   * The username associated with the comment.
   */
  public readonly ownUsername = input.required<string>();

  onChatJoin = (test: any) => {
    console.log(
      '%conChatJoin',
      'background!: lime; color: black; padding: 5px',
      test
    );
  };

  onChatNewMessage = (test: any) => {
    console.log('onChatNewMessage', test);
  };

  onChatLeave = (test: any) => {
    console.log('onChatLeave', test);
  };

  ngOnInit() {
    console.log('chatmodule ngOnInit');

    this.chatWebSocketsService.connect();

    this.chatWebSocketsService.setOnJoin(this.onChatJoin);
    this.chatWebSocketsService.setOnChatMessage(this.onChatNewMessage);
    this.chatWebSocketsService.setOnLeave(this.onChatLeave);
  }

  ngOnDestroy() {
    this.chatWebSocketsService.disconnect();
  }

  onSubmit = (event: Event) => {
    event.preventDefault();

    const formValues = this.sendMessageForm.value;
    console.log('Form Values:', formValues);

    const { message } = formValues;

    this.chatWebSocketsService.sendMessage(this.ownUsername(), message!);
  };
}
