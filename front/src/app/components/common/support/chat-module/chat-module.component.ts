import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebSocketsService } from '@core/services/websockets/websockets.service';

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

  protected readonly webSocketsService = inject(WebSocketsService);

  /**
   * The username associated with the comment.
   */
  public readonly ownUsername = input.required<string>();

  ngOnInit() {
    this.webSocketsService.connect(console.log);
  }

  onSubmit(event: Event) {
    event.preventDefault();
  }
}
