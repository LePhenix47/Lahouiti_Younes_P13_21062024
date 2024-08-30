import { Injectable } from '@angular/core';

/**
 * A service that manages the display mode of media elements.
 */
@Injectable({
  providedIn: 'root',
})
export class MediaDisplayModeService {
  /**
   * Requests the video element to enter picture-in-picture (PiP) mode.
   *
   * @param videoElement - The video element to enter picture-in-picture mode.
   * @returns A promise that resolves when the video element has entered picture-in-picture mode.
   * @throws {Error} If the video element is not set.
   * @throws {Error} If the browser does not support picture-in-picture mode.
   */
  public requestPictureInPicture = async (
    videoElement: HTMLVideoElement
  ): Promise<void> => {
    try {
      if (!videoElement) {
        throw new Error(
          'Cannot request picture-in-picture: video element is not set'
        );
      }

      if (!document.pictureInPictureEnabled) {
        throw new Error(
          'Cannot enable picture-in-picture: PiP mode is not supported by your browser'
        );
      }

      if (document.pictureInPictureElement) {
        throw new Error('Already in picture-in-picture mode');
      }

      await videoElement.requestPictureInPicture();
    } catch (error) {
      error as Error;
      console.error('Error requesting picture-in-picture', error);
      throw error;
    }
  };

  /**
   * Removes the video element from picture-in-picture (PiP) mode.
   *
   * @returns A promise that resolves when the video element has been removed from picture-in-picture mode.
   * @throws {Error} If the browser does not support picture-in-picture mode.
   */
  public removePictureInPicture = async (): Promise<void> => {
    try {
      if (!document.pictureInPictureEnabled) {
        console.error(
          'Cannot disable picture-in-picture: PiP is not supported by your browser'
        );

        return;
      }

      if (!document.pictureInPictureElement) {
        console.warn('Not in picture-in-picture mode');

        return;
      }

      await document.exitPictureInPicture();
    } catch (error) {
      error as Error;
      console.error('Error removing picture-in-picture', error);
      throw error;
    }
  };

  /**
   * Enters fullscreen mode for the specified HTML element.
   *
   * @async
   * @param {HTMLElement} htmlElement - The HTML element to enter fullscreen mode.
   * @param {Object} options - Additional options for fullscreen mode.
   * @throws {Error} If the element is already in fullscreen mode.
   */
  public enterFullscreenMode = async (
    htmlElement: HTMLElement,
    options?: Partial<FullscreenOptions>
  ): Promise<void> => {
    try {
      if (!htmlElement) {
        throw new Error(
          `Expected HTML element to be truthy but instead got ${htmlElement}`
        );
      }

      if (document.fullscreenElement) {
        throw new Error(
          'You cannot enter fullscreen mode again if it is already in fullscreen'
        );
      }

      const fullscreenRequest: (
        options?: FullscreenOptions | undefined
      ) => Promise<void> =
        // @ts-ignore We need to use the webkit version here
        htmlElement?.requestFullscreen || htmlElement?.webkitRequestFullscreen;

      if (!fullscreenRequest) {
        throw new Error('Fullscreen API is not supported');
      }

      // For Mozilla Firefox
      window.focus();

      await fullscreenRequest.call(htmlElement, options);
    } catch (error) {
      error as Error;
      console.error(error);
      throw error;
    }
  };

  /**
   * Exits fullscreen mode.
   *
   * @async
   * @throws {Error} If the document is not currently in fullscreen mode.
   */
  public exitFullscreenMode = async (): Promise<void> => {
    try {
      if (!document.fullscreenElement) {
        throw new Error(
          'You cannot exit fullscreen mode if it is not currently in fullscreen'
        );
      }

      const exitFullscreen: () => Promise<void> =
        // @ts-ignore We need to use the webkit version here
        document?.exitFullscreen || document?.webkitExitFullscreen;

      if (!exitFullscreen) {
        throw new Error('Fullscreen API is not supported');
      }

      await exitFullscreen.call(document);
    } catch (error) {
      error as Error;
      console.error(error);
      throw error;
    }
  };
}
