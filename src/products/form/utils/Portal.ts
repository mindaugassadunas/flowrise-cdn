// Portal.ts
export class Portal {
  private portalContainer: HTMLElement;
  private originalParent: HTMLElement | null = null;
  private originalNextSibling: Node | null = null;
  private readonly portalId: string;

  constructor(className: string = 'portal-container') {
    this.portalId = `portal-${Math.random().toString(36).substr(2, 9)}`;
    this.portalContainer = document.createElement('div');
    this.portalContainer.className = className;
    this.portalContainer.setAttribute('data-portal-id', this.portalId);
    Object.assign(this.portalContainer.style, {
      position: 'absolute',
      zIndex: '9999',
      display: 'block',
      visibility: 'visible',
    });
  }

  getPortalId(): string {
    return this.portalId;
  }

  mount(element: HTMLElement): void {
    if (!element) return;

    // Store original position
    this.originalParent = element.parentElement;
    this.originalNextSibling = element.nextSibling;

    // Move to portal
    this.portalContainer.appendChild(element);
    document.body.appendChild(this.portalContainer);
  }

  unmount(): HTMLElement | null {
    const element = this.portalContainer.firstElementChild as HTMLElement;
    if (!element || !this.originalParent) return null;

    // Return to original position
    if (this.originalNextSibling) {
      this.originalParent.insertBefore(element, this.originalNextSibling);
    } else {
      this.originalParent.appendChild(element);
    }

    // Remove portal container
    this.portalContainer.remove();

    return element;
  }

  updatePosition(
    referenceElement: HTMLElement,
    options: {
      placement?: 'top' | 'bottom' | 'auto';
      offset?: number;
      maxHeight?: number;
    } = {},
  ): void {
    const { placement = 'bottom', offset = 4, maxHeight } = options;

    const referenceRect = referenceElement.getBoundingClientRect();
    const portalRect = this.portalContainer.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    let top: number;
    let actualPlacement = placement;

    if (placement === 'auto') {
      const spaceBelow = windowHeight - referenceRect.bottom;
      const spaceAbove = referenceRect.top;
      actualPlacement = spaceBelow >= spaceAbove ? 'bottom' : 'top';
    }

    if (actualPlacement === 'bottom') {
      top = referenceRect.bottom + offset;
    } else {
      top = referenceRect.top - portalRect.height - offset;
    }

    Object.assign(this.portalContainer.style, {
      top: `${top}px`,
      left: `${referenceRect.left}px`,
      width: `${referenceRect.width}px`,
    });

    if (maxHeight) {
      const firstChild = this.portalContainer.firstElementChild as HTMLElement;
      if (firstChild) {
        firstChild.style.maxHeight = `${maxHeight}px`;
      }
    }
  }

  getContainer(): HTMLElement {
    return this.portalContainer;
  }

  destroy(): void {
    this.unmount();
  }
}

// export class Portal {
//     private portalContainer: HTMLElement | null = null;
//     private originalElement: HTMLElement | null = null;

//     private originalParent: HTMLElement | null = null;
//     private originalNextSibling: Node | null = null;

//     constructor(element: HTMLElement) {
//         this.originalElement = element;
//     }

//     public setupPortal(): void {
//         // Create portal container
//         this.portalContainer = document.createElement('div');
//         this.portalContainer.className = 'dropdown-portal';
//         Object.assign(this.portalContainer.style, {
//           position: 'fixed',
//           zIndex: '9999',
//           display: 'block',
//           visibility: 'visible',
//         });
//       }

//       public moveToPortal(): void {
//         if (!this.portalContainer || !this.originalElement) return;

//         // Store original position
//         this.originalParent = this.originalElement.parentElement;
//         this.originalNextSibling = this.originalElement.nextSibling;

//         this.originalElement.style.display = 'block';

//         // Move to portal
//         this.portalContainer.appendChild(this.originalElement);
//         document.body.appendChild(this.portalContainer);
//       }

//       public removeFromPortal(): void {
//         if (!this.originalElement || !this.originalParent) return;

//         // Return to original position
//         if (this.originalNextSibling) {
//           this.originalParent.insertBefore(this.originalElement, this.originalNextSibling);
//         } else {
//           this.originalParent.appendChild(this.originalElement);
//         }

//         // Remove portal container
//         this.portalContainer?.remove();
//       }
// }
