/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LitElement,
  html,
  TemplateResult,
  css,
  PropertyValues,
  CSSResultGroup,
} from 'lit';
import { property, state } from "lit/decorators";
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers
import { CARD_VERSION } from './constants';
import './editor';

import type { BoilerplateCardConfig } from './types';
import { actionHandler } from './action-handler-directive';

/* eslint no-console: 0 */
console.info(
  `%c  Donder Automation \n%c  version: ${CARD_VERSION}  `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'donder-automation',
  name: 'Donder Automation',
  description: 'A template custom card for you to create something awesome',
});

export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    // REPLACE "donder-automation" with widget name, everywhere in the project
    // REPLACE the file name with the actual widget name
    return document.createElement('donder-automation-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: BoilerplateCardConfig;
  @state() protected holdTimeout;

  public setConfig(config: BoilerplateCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error('Invalid configuration');
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'Boilerplate',
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected handleClick() {
    const { settings, confirmation } = this.config
    if (confirmation) {
      this.hass.callService('browser_mod', 'popup', {
        content: this.config.content || "Are you sure you want to perform this operation?",
        right_button: this.config.confirm_text || "Confirm",
        right_button_action: {
          service: `${settings.domain}.${settings.service}`,
          data: settings.service_data
        },
        left_button: "Close",
        left_button_action: this.hass.callService('browser_mod', 'close_popup', {browser_id: localStorage.getItem('browser_mod-browser-id')}),
        browser_id: localStorage.getItem('browser_mod-browser-id'),
      })
    } else {
      this.hass.callService(settings.domain, settings.service, settings.service_data)
    }
  }

  protected _handleAction(ev: ActionHandlerEvent): void {
    const { action } = ev?.detail

    if (action === 'hold') {
      this.handleHold()
    }

    if (action === 'tap') {
      this.handleClick()
    }
  }

  protected handleHold() {
    const env = this.hass.states['donder_env.global'].attributes
    const scene = this.hass.states['donder_scenes.global'].attributes[this.config.scene]
    console.log(scene)
    this.hass.callService('browser_mod', 'popup', {
      content: {
        type: 'custom:donder-scene-modal',
        sensors: env.sensors,
        devices: [
          ...env.shutters || [],
          ...env.switches || [],
        ],
        locked: true,
        sceneName: this.config.scene,
        scene: scene
      },
      browser_id: localStorage.getItem('browser_mod-browser-id'),
    })
  }

  private _showWarning(warning: string): TemplateResult {
    return html`
      <hui-warning>${warning}</hui-warning>
    `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html`
      ${errorCard}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .type-custom-donder-automation {
        height: 100%;
        width: 100%;
      }
      .donder-widget {
        background-color: transparent;
        color: var(--text-primary-color);
        padding: 5px 22px 15px;
        box-sizing: border-box;
        text-align: center;
        border-radius: var(--ha-card-border-radius);
        font-size: 10px;
        text-transform: uppercase;
      }
      .automation-icon{
        padding: 20px 0 5px 0;
        margin: 0 auto;
      }
      .automation-icon ha-icon{
        --mdc-icon-size: 60%;
      }
      @media (max-width: 600px) {
        .donder-widget {
          margin-right: 0;
        }
      }
    `;
  }

  protected handleMouseDown() {
    this.startHoldTimer();
  }

  protected handleMouseUp() {
    this.clearHoldTimer();
  }

  protected handleMouseLeave() {
    this.clearHoldTimer();
  }

  protected handleTouchStart() {
    this.startHoldTimer();
  }

  protected handleTouchEnd() {
    this.clearHoldTimer();
  }

  protected handleTouchCancel() {
    this.clearHoldTimer();
  }

  protected startHoldTimer() {
    this.holdTimeout = setTimeout(() => {
      this.handleHold();
    }, 1000);
  }

  protected clearHoldTimer() {
    clearTimeout(this.holdTimeout); // Clear the timeout if touch/mouse is released or canceled before 2 seconds
  }


  protected render(): TemplateResult | void {
    /*
      ## INTERFACE
      - this.hass: A lot of information about everything in HA, such as states, theme, etc. The source of the tree
        - states: States of each of the components available
      - this.config: Lovelace settings for this instance

      Example: this.hass.states[this.config.entities[0]] shows the state of the first component
     */

    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this._showWarning('warning message');
    }

    if (this.config.show_error) {
      return this._showError('error message');
    }

    return html`
      <ha-card
       @mousedown=${() => this.handleMouseDown()}
        @mouseup=${this.handleMouseUp}
        @mouseleave=${this.handleMouseLeave}
        @touchstart=${() => this.handleTouchStart()}
        @touchend=${this.handleTouchEnd}
        @touchcancel=${this.handleTouchCancel}
        @click=${() => this.handleClick()}
        tabindex="0"
        .label=${`Boilerplate: ${this.config || 'No Entity Defined'}`}
      >
        <div class='donder-widget'>
          <div class='automation-icon'>
            <ha-icon icon=${`hass:${this.config.icon}`}></ha-icon>
          </div>
          ${this.config.name}
        </div>
      </ha-card>
    `;
  }
}

customElements.define("donder-automation", BoilerplateCard);
