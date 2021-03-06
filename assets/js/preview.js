var SeoSerpPreview = new Class({
    Implements: [Options],

    /**
     * Default options
     */
    options: {
        'hidden': false,
        'bodySelector': '.preview-body',
        'hintSelector': '.preview-hint',
        'indexSelector': '.preview-index',
        'titleSelector': '[data-ssp-title]',
        'urlSelector': '[data-ssp-url]',
        'descriptionSelector': '[data-ssp-description]',
        'keywordMarkClass': 'keyword-mark',
        'counterClass': 'seo-serp-preview-counter',
        'counterLimitClass': 'limit-exceeded',
        'noIndexClass': 'no-index',
        'titleLimit': 70,
        'descriptionLimit': 320,
        'keywordCharacterLength': 4,
        'titleFormat': '##title##',
        'entitiesMapper': {
            '[&]': '&amp;',
            '[&amp;]': '&amp;',
            '[lt]': '&lt;',
            '[gt]': '&gt;',
            '[nbsp]': '&nbsp;',
            '[-]': '&shy;',
        }
    },

    /**
     * Initialize the class
     *
     * @param {object} el
     * @param {object} engine
     * @param {object} options
     */
    initialize: function (el, engine, options) {
        this.el = el;
        this.engine = engine;
        this.setOptions(options);

        // Collect the widget elements
        this.collectElements();

        // Wait until the engine is ready
        this.engine.addEvent('ready', function () {
            // Add the description character counter
            this.addDescriptionCounter();

            // Add the event listener
            this.engine.addEvent('change', this.refresh.bind(this));

            // Refresh the preview state
            this.refresh();
        }.bind(this));

        this.engine.init();
    },

    /**
     * Add the description character counter to the fields
     */
    addDescriptionCounter: function () {
        this.descriptionCounter = this.engine.addDescriptionCounter(
            new Element('span', {'class': this.options.counterClass})
        );
    },

    /**
     * Update the description character counter
     *
     * @param {string} text
     */
    updateDescriptionCounter: function (text) {
        this.descriptionCounter.set('text', '(' + text.length + '/' + this.options.descriptionLimit + ')');

        if (text.length > this.options.descriptionLimit) {
            this.descriptionCounter.addClass(this.options.counterLimitClass);
        } else {
            this.descriptionCounter.removeClass(this.options.counterLimitClass);
        }
    },

    /**
     * Refresh the preview state
     */
    refresh: function () {
        if (this.options.hidden && this.engine.showElement && !this.engine.showElement()) {
            this.el.hide();
            this.descriptionCounter.hide();
            return;
        }

        var data = this.collectData();

        this.updateDescriptionCounter(data.description);

        if (!this.validateData(data)) {
            this.hideBody();
            return;
        }

        this.renderData(data);
        this.showBody();

        // Show element if it was hidden
        if (this.options.hidden) {
            this.el.show();
            this.descriptionCounter.show();
        }
    },

    /**
     * Collect the elements
     */
    collectElements: function () {
        this.body = this.el.getElement(this.options.bodySelector);
        this.hint = this.el.getElement(this.options.hintSelector);
        this.index = this.el.getElement(this.options.indexSelector);
        this.title = this.el.getElement(this.options.titleSelector);
        this.url = this.el.getElement(this.options.urlSelector);
        this.description = this.el.getElement(this.options.descriptionSelector);
    },

    /**
     * Collect the data
     *
     * @returns {object}
     */
    collectData: function () {
        return data = {
            'title': this.restoreEntities(this.engine.getTitle()),
            'url': this.engine.getUrl(),
            'description': this.restoreEntities(this.engine.getDescription()),
            'index': this.engine.getIndex ? this.engine.getIndex() : true
        };
    },

    /**
     * Restore the entities
     *
     * @param {string} value
     *
     * @returns {string}
     */
    restoreEntities: function (value) {
        for (var key in this.options.entitiesMapper) {
            // Create the RegExp from escaped string and replace the value
            // @see https://stackoverflow.com/a/3561711/3628692
            value = value.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), this.options.entitiesMapper[key]);
        }

        return value;
    },

    /**
     * Validate the data if it can be applied to the preview
     *
     * @param {object} data
     *
     * @returns {boolean}
     */
    validateData: function (data) {
        var valid = false;

        for (var i in data) {
            if (data[i] != '') {
                valid = true;
            }
        }

        return valid;
    },

    /**
     * Render the data to the preview
     *
     * @param {object} data
     */
    renderData: function (data) {
        this.textElements = []; // initialize the text elements array

        this.setTitle(data.title);
        this.setUrl(data.url);
        this.setDescription(data.description);

        // Toggle the index message
        data.index ? this.hideIndex() : this.showIndex();
    },

    /**
     * Set the title
     *
     * @param {string} value
     */
    setTitle: function (value) {
        // Strip the HTML tags
        var tmp = document.createElement('div');
        tmp.innerHTML = value;
        value = tmp.textContent;

        value = this.options.titleFormat.replace('##title##', value);

        if (value.length > this.options.titleLimit) {
            value = value.substr(0, this.options.titleLimit) + '...';
        }

        this.generateTextElements(value, this.title);
    },

    /**
     * Set the URL
     *
     * @param {string} value
     */
    setUrl: function (value) {
        this.generateTextElements(value, this.url);
    },

    /**
     * Set the description
     *
     * @param {string} value
     */
    setDescription: function (value) {
        // Strip the HTML tags
        var tmp = document.createElement('div');
        tmp.innerHTML = value;
        value = tmp.textContent;

        if (value.length > this.options.descriptionLimit) {
            value = value.substr(0, this.options.descriptionLimit) + '...';
        }

        this.generateTextElements(value, this.description);
    },

    /**
     * Generate the text elements
     *
     * @param {string} text
     * @param {object} el
     */
    generateTextElements: function (text, el) {
        var rgxp = new RegExp(/\,|\.|\;|\!|\?|\-|\s|\\|\//);
        var word = [];

        // Empty the description
        el.set('html', '');

        // Generate the text with DOM elements
        for (var i = 0; i < text.length; i++) {
            if (rgxp.test(text[i])) {
                // Create the word
                if (word.length > 0) {
                    this.createTextElement(word.join(''), el);

                    // Reset the word
                    word = [];
                }

                (new Element('span', {'text': text[i]})).inject(el, 'bottom');

                continue;
            }

            word.push(text[i]);
        }

        // Create the last word if present
        if (word.length > 0) {
            this.createTextElement(word.join(''), el);
        }
    },

    /**
     * Create the text element
     *
     * @param {string} text
     * @param {object} el
     */
    createTextElement: function (text, el) {
        var self = this;
        var span = new Element('span', {'text': text});

        span.addEvent('mouseenter', function () {
            self.markKeywords.call(self, this.get('text'), this);
        });

        span.addEvent('mouseleave', this.unmarkKeywords.bind(this));
        span.inject(el, 'bottom');

        // Add as text element
        this.textElements.push(span);
    },

    /**
     * Mark the keywords
     *
     * @param {string} text
     * @param {object} origin
     */
    markKeywords: function (text, origin) {
        var i = 0;
        var els = [];

        // Lowercase the text
        text = text.toLowerCase();

        // Create the multiple variations if the highlighted text is longer than the keyword character length
        if (text.length >= this.options.keywordCharacterLength) {
            var variations = [];

            // Generate variations
            for (i = 0; i <= (text.length - this.options.keywordCharacterLength); i++) {
                variations.push(text.substr(i, this.options.keywordCharacterLength));
            }

            for (i = 0; i < this.textElements.length; i++) {
                var elText = this.textElements[i].get('text').toLowerCase();

                // Do not look for variations in origin element
                if (origin && this.textElements[i] === origin) {
                    els.push(origin);
                    continue;
                }

                for (var j = 0; j < variations.length; j++) {
                    // Highlight the word if it only contains the variation
                    if (elText.indexOf(variations[j]) !== -1) {
                        els.push(this.textElements[i]);
                    }
                }
            }
        } else {
            // If the word is not longer than character limit do not create multiple variations
            for (i = 0; i < this.textElements.length; i++) {
                if (this.textElements[i].get('text').toLowerCase() === text) {
                    els.push(this.textElements[i]);
                }
            }
        }

        // Highlight words if there is more than one element
        if (els.length > 1) {
            for (i = 0; i < els.length; i++) {
                els[i].addClass(this.options.keywordMarkClass);
            }
        }
    },

    /**
     * Unmark the keywords
     */
    unmarkKeywords: function () {
        for (var i = 0; i < this.textElements.length; i++) {
            this.textElements[i].removeClass(this.options.keywordMarkClass);
        }
    },

    /**
     * Hide the body and show hint
     */
    hideBody: function () {
        this.hint.show();
        this.body.hide();
    },

    /**
     * Show the body and hide hint
     */
    showBody: function () {
        this.hint.hide();
        this.body.show();
    },

    /**
     * Hide the index message
     */
    hideIndex: function () {
        this.index.hide();
        this.el.removeClass(this.options.noIndexClass);
    },

    /**
     * Show the index message
     */
    showIndex: function () {
        this.index.show();
        this.el.addClass(this.options.noIndexClass);
    }
});
