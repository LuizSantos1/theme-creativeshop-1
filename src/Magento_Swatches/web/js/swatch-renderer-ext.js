/**
 * Origin: Magento swatch renderer
 * Modification type: extend
 * Reason:
 * 1) To add selecting swatches based on selected filters (by referrer url).
 * Swatches can be selected only after:
 * - gallery is loaded, to keep correct gallery behaviour
 * - attributes config is prepared by widget logic
 * 2) For configurable products after choosing a swatch there is no class indicating that price is special
 * - add class 'discounted-price' to special price if necessary after swatch changes
 * 3) If there is only one swatch for attribute it is not selected and user has to click on it
 * - check if there is only one swatch available and checked it for user
 */
define(['jquery', 'underscore'], function($, _) {
    'use strict';

    return function(swatchRenderer) {
        $.widget('mage.SwatchRenderer', swatchRenderer, {
            _onGalleryLoaded: function(gallery) {
                this._super(gallery);

                // Add gallery loaded flag for selecting swatches reference
                this._isGalleryLoaded = true;
            },
            _RenderControls: function() {
                this._super();
                var _this = this;
                var gallery = $(
                    '[data-gallery-role=gallery-placeholder]',
                    '.column.main'
                );

                // If gallery is already loaded, select swatches
                // otherwise wait for 'gallery:loaded' event
                if (_this._isGalleryLoaded === true) {
                    _this._SelectSwatchesBasedOnReferrer();
                }

                $(gallery).on('gallery:loaded', function() {
                    _this._SelectSwatchesBasedOnReferrer();
                });

                // Check if there is only one swatch available and execute _OnClick method on it
                this.element
                    .find('.' + this.options.classes.attributeClass)
                    .each(function() {
                        var $options = $(this).find('.swatch-option');
                        if ($options.length === 1) {
                            _this._OnClick($options, _this);
                        }
                    });
            },
            _SelectSwatchesBasedOnReferrer: function() {
                var _this = this;

                var referrerQueryString = document.referrer.substring(
                    document.referrer.indexOf('?') + 1
                );

                // Do nothing if there is no query string or configred attributes
                if (
                    !(
                        referrerQueryString.length &&
                        $.isArray(_this.options.jsonConfig.attributes)
                    )
                ) {
                    return;
                }

                var searchParams = {};

                $.each(referrerQueryString.split('&'), function(index, item) {
                    var split = item.split('=');
                    var key = split[0] && decodeURIComponent(split[0]);
                    var value = split[1] && decodeURIComponent(split[1]);

                    (searchParams[key] = searchParams[key] || []).push(value);
                });

                // Reduce swatches config to have just option labels and IDs
                var swatches = _this.options.jsonConfig.attributes.reduce(
                    function(acc, swatch) {
                        acc[swatch.code] = acc[swatch.code] || {};

                        $.each(swatch.options, function(index, option) {
                            acc[swatch.code][option.label] = option.id;
                        });

                        return acc;
                    },
                    {}
                );

                $.each(Object.keys(searchParams), function(index, key) {
                    // Take the first value of the param
                    var value = searchParams[key][0];

                    // Check if search param contains an optionId for any of configured swatches
                    var optionId =
                        swatches[key] && swatches[key][value]
                            ? swatches[key][value]
                            : null;

                    if (!optionId) {
                        return;
                    }

                    // Select swatches based on attributeCode and optionId
                    var $option = _this.element.find(
                        '.' +
                            _this.options.classes.attributeClass +
                            '[attribute-code="' +
                            key +
                            '"] [option-id="' +
                            optionId +
                            '"]'
                    );

                    if ($option.length) {
                        var $parentInput = $option.parent();

                        if ($option.hasClass('selected')) {
                            return;
                        }

                        if (
                            $parentInput.hasClass(
                                _this.options.classes.selectClass
                            )
                        ) {
                            $parentInput.val(optionId);
                            $parentInput.trigger('change');
                        } else {
                            $option.trigger('click');
                        }
                    }
                });
            },
            _UpdatePrice: function() {
                this._super();

                // After original method is executed check if oldPrice is not equal to finalPrice
                // and add class 'discounted-price' to special price if necessary

                var options = _.object(_.keys(this.optionsMap), {});

                this.element
                    .find(
                        '.' +
                            this.options.classes.attributeClass +
                            '[option-selected]'
                    )
                    .each(function() {
                        var attributeId = $(this).attr('attribute-id');

                        options[attributeId] = $(this).attr('option-selected');
                    });

                var result = this.options.jsonConfig.optionPrices[
                    _.findKey(this.options.jsonConfig.index, options)
                ];

                var $discounted =
                    typeof result !== 'undefined' &&
                    result.oldPrice.amount !== result.finalPrice.amount;

                $(
                    '.normal-price .price-final_price .price-wrapper .price'
                ).toggleClass('discounted-price', $discounted);
            },
        });

        return $.mage.SwatchRenderer;
    };
});
