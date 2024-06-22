import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-access-support',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './access-support.component.html',
  styleUrl: './access-support.component.scss',
})
export class AccessSupportComponent {
  /**
   * Form builder service for creating reactive forms.
   */
  private readonly formBuilder = inject(FormBuilder);

  /**
   * Article creation form.
   */
  public readonly chatForm = this.formBuilder.group({
    username: [['', Validators.required]],
  });

  public onSubmit = (event: Event): void => {
    event.preventDefault();

    console.log('submit');
  };
}
