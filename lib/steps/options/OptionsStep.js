import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Option from './Option';
import OptionElement from './OptionElement';
import OptionText from './OptionText';
import Options from './Options';

class OptionsStep extends Component {
  /* istanbul ignore next */
  constructor(props) {
    super(props);
    this.state = {
      optionsSelected: []
    };
    this.renderOption = this.renderOption.bind(this);
    this.onOptionClick = this.onOptionClick.bind(this);
  }

  onOptionClick({ value, allowMultiselect }) {
    if (!allowMultiselect) {
      return this.props.triggerNextStep({ value });
    }
    if (value === "proceed") {
      return this.props.triggerNextStep({ value, optionsSelected: this.state.optionsSelected });
    }
    this.setState({
      optionsSelected: [
        ...this.state.optionsSelected,
        value
      ]
    });
  }

  renderOption(allowMultiselect) {
    return (option) => {
      const { bubbleStyle } = this.props;
      const { bubbleColor, fontColor } = this.props.step;
      const { value, label, optionStyle } = option;
      const optionElementStyles = [
        bubbleStyle,
        optionStyle,
        allowMultiselect && this.state.optionsSelected.includes(value) ? { borderWidth: 2 } : {}
      ];

      return (
        <Option
          key={value}
          className="rsc-os-option"
          onPress={() => this.onOptionClick({ value, allowMultiselect })}
        >
          <OptionElement
            className="rsc-os-option-element"
            style={optionElementStyles}
            bubbleColor={bubbleColor}
          >
            <OptionText
              class="rsc-os-option-text"
              fontColor={fontColor}
            >
              {typeof label === 'function' ? label() : label}
            </OptionText>
          </OptionElement>
        </Option>
      );
    };
  }

  render() {
    const { step: { options, allowMultiselect = false } } = this.props;

    return (
      <Options className="rsc-os">
        {_.map(options, this.renderOption(allowMultiselect))}
      </Options>
    );
  }
}

OptionsStep.propTypes = {
  step: PropTypes.object.isRequired,
  triggerNextStep: PropTypes.func.isRequired,
  bubbleStyle: PropTypes.object.isRequired
};

export default OptionsStep;
