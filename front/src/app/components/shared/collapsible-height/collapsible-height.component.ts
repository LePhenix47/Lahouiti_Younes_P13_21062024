import { Component, input } from '@angular/core';

@Component({
  selector: 'app-collapsible-height',
  standalone: true,
  imports: [],
  templateUrl: './collapsible-height.component.html',
  styleUrl: './collapsible-height.component.scss',
})
export class CollapsibleHeightComponent {
  /**
   * Whether the component should use semantic HTML elements (`<details>` and `<summary>` instead of `<div>`) or not.
   */
  public readonly withSemantics = input<boolean>(false);

  /**
   * Whether the component should be opened or not.
   */
  public readonly isOpen = input.required<boolean>();
}
