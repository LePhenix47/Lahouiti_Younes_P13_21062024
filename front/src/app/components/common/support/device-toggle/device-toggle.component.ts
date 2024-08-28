import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DeviceInfo } from '@core/types/videoconference/videoconference.types';

@Component({
  selector: 'app-device-toggle',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './device-toggle.component.html',
  styleUrl: './device-toggle.component.scss',
})
export class DeviceToggleComponent {
  public readonly deviceType = input.required<string>();
  public readonly isEnabled = input.required<boolean>();
  public readonly deviceList = input.required<DeviceInfo[]>();

  // TODO: Add input signals for WebRTC + screen recording + device switch

  public readonly handleSwitchOutput = output<Event>();
  public readonly handleToggleOutput = output<Event>();

  public handleSwitch = (event: Event): void => {
    this.handleSwitchOutput.emit(event);
  };

  public handleToggle = (event: Event): void => {
    this.handleToggleOutput.emit(event);
  };
}
