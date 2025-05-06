// modal.js

class Modal {
    // Constructor accepts the modal content element (the div in your HTML)
    // Returns null if the modalElement is not found
    constructor(modalElement, options = {}) {
        if (!modalElement) {
            console.error("Modal element must be provided to the Modal constructor.");
            // Return null if the element is not found. This is what necessitates the checks in the calling code.
            return null;
        }

        this.modalEl = modalElement;
        this.backdropEl = null; // Backdrop will be created dynamically

        this.options = {
            backdropClose: options.backdropClose !== undefined ? options.backdropClose : true, // Close on backdrop click
            keyboardClose: options.keyboardClose !== undefined ? options.keyboardClose : true // Close on escape key
        };

        this.isOpen = false;

        // Create the backdrop element when the modal instance is created
        this._createBackdrop();
        // Attach events to modal content and the created backdrop
        this.attachEvents();

        // Return the instance explicitly if creation was successful
        return this;
    }

    _createBackdrop() {
         // Create backdrop dynamically
        this.backdropEl = document.createElement('div');
        this.backdropEl.classList.add('modal-backdrop');
        // Initially hidden via CSS display: none

        // Append to body immediately, but it's display: none
        // This ensures it exists in the DOM when we need to transition it
        document.body.appendChild(this.backdropEl);
    }


    attachEvents() {
        // Find close buttons within the provided modal element
        const closeButtons = this.modalEl.querySelectorAll('.modal-close-button');
        closeButtons.forEach(button => {
            // Use an arrow function for consistent `this` context
            button.addEventListener('click', () => this.hide());
        });

        // *** MODIFIED: Attach click listener to the modal wrapper (this.modalEl) ***
        if (this.options.backdropClose) {
             this.modalEl.addEventListener('click', (event) => {
                 // Check if the click target is the modal wrapper itself, NOT any element inside the modal content
                 if (event.target === this.modalEl) {
                    this.hide();
                 }
            });
        }

        // Global Escape key listener is added/removed in show/hide methods
    }

    // Use an arrow function to maintain the correct 'this' context for the event listener
    handleEscapeKey = (event) => {
         if (event.key === 'Escape') {
             this.hide();
         }
    }

    show() {
        if (this.isOpen) return; // Prevent showing if already open

        // Ensure backdrop is in the DOM (it is, from _createBackdrop) and set to block
        if(this.backdropEl) {
           this.backdropEl.style.display = 'block';
        }


        // Use a small delay to allow display change to register before applying transition classes
        // This is crucial for the CSS transitions (opacity, transform) to work on initial show
        setTimeout(() => {
            if(this.backdropEl) {
                this.backdropEl.classList.add('show');
            }
            this.modalEl.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            this.isOpen = true;

            // Attach escape key listener only when the modal is open
            if (this.options.keyboardClose) {
                 document.addEventListener('keydown', this.handleEscapeKey);
            }

            // Optional: Dispatch a custom event on the modal element
            // This allows external code to react when the modal is fully visible
            const showEvent = new CustomEvent('modal.shown', { detail: { modalId: this.modalEl.id } });
            this.modalEl.dispatchEvent(showEvent);

        }, 10); // A small timeout (e.g., 10ms) is usually sufficient
    }

    hide() {
        if (!this.isOpen) return; // Prevent hiding if already closed

        // Remove the 'show' classes to trigger the CSS fade/slide transitions
        if(this.backdropEl) {
            this.backdropEl.classList.remove('show');
        }
        this.modalEl.classList.remove('show');
        this.isOpen = false;

        // Remove the global escape key listener
        if (this.options.keyboardClose) {
            document.removeEventListener('keydown', this.handleEscapeKey);
        }

        // Wait for the CSS transition on the backdrop (or modal) to finish before setting display: none
        // This ensures the fade-out animation completes
        const transitionElement = this.backdropEl || this.modalEl; // Choose an element that transitions

        transitionElement.addEventListener('transitionend', function handler() {
             // Once the transition is finished, set display to none to fully hide the backdrop element
             if(this.backdropEl) {
                 this.backdropEl.style.display = 'none';
             }
            // Re-enable background scrolling
            document.body.style.overflow = '';

             // Optional: Dispatch a custom event on the modal element
             // This allows external code to react when the modal is completely hidden
            const hiddenEvent = new CustomEvent('modal.hidden', { detail: { modalId: this.modalEl.id } });
            this.modalEl.dispatchEvent(hiddenEvent);

            // Clean up the event listener itself using { once: true }
            transitionElement.removeEventListener('transitionend', handler);

        }.bind(this), { once: true }); // Use .bind(this) to pass the class instance's 'this' to the handler function
    }

    // Method to remove the modal element and its dynamically created backdrop from the DOM
    // Useful if you no longer need a specific modal instance on the page
    dispose() {
         // Remove event listeners to prevent memory leaks
         // For a simple dispose, we rely on removing the elements,
         // which typically cleans up listeners attached directly to those elements.
         // For more complex scenarios, explicitly removing listeners with removeEventListener is needed.

         // Ensure the escape key listener is removed if it's currently active
         if (this.options.keyboardClose && this.isOpen) {
             document.removeEventListener('keydown', this.handleEscapeKey);
         }

        // Remove the modal element from the DOM
        if (this.modalEl && this.modalEl.parentNode) {
            this.modalEl.parentNode.removeChild(this.modalEl);
        }
        // Remove the dynamically created backdrop from the DOM
         if (this.backdropEl && this.backdropEl.parentNode) {
            this.backdropEl.parentNode.removeChild(this.backdropEl);
        }

        // Reset internal state and references
        this.isOpen = false;
        document.body.style.overflow = ''; // Ensure scroll is re-enabled
        this.modalEl = null; // Clear reference
        this.backdropEl = null; // Clear reference

        console.log(`Modal instance disposed.`);
    }
}