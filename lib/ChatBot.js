import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Random from 'random-id';
import { Dimensions, Keyboard, TextInput, ScrollView, Platform, ImageBackground, Text, View } from 'react-native';
import { CustomStep, OptionsStep, TextStep } from './steps/steps';
import ExpandingTextInput from './ExpandingTextInput';
import schema from './schemas/schema';
import ChatBotContainer from './ChatBotContainer';
import InputView from './InputView';
import Footer from './Footer';
import Button from './Button';
import ButtonText from './ButtonText';

const { height, width } = Dimensions.get('window');

class ChatBot extends Component {
  /* istanbul ignore next */
  constructor(props) {
    super(props);

    this.state = {
      renderedSteps: [],
      previousSteps: [],
      currentStep: {},
      previousStep: {},
      steps: {},
      editable: false,
      inputValue: '',
      inputInvalid: false,
      inputHeight: 80,
      defaultUserSettings: {},
    };

    this.getStepMessage = this.getStepMessage.bind(this);
    this.getTriggeredStep = this.getTriggeredStep.bind(this);
    this.generateRenderedStepsById = this.generateRenderedStepsById.bind(this);
    this.renderStep = this.renderStep.bind(this);
    this.triggerNextStep = this.triggerNextStep.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.onButtonPress = this.onButtonPress.bind(this);
    this.setContentRef = this.setContentRef.bind(this);
    this.setInputRef = this.setInputRef.bind(this);
    this.setScrollViewScrollToEnd = this.setScrollViewScrollToEnd.bind(this);

    // instead of using a timeout on input focus/blur we can listen for the native keyboard events
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.setScrollViewScrollToEnd);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.setScrollViewScrollToEnd);
  }

  componentWillMount() {
    const {
      botDelay,
      botAvatar,
      botBubbleColor,
      botFontColor,
      customDelay,
      customLoadingColor,
      userDelay,
      userAvatar,
      userBubbleColor,
      userFontColor,
    } = this.props;
    const steps = {};

    const defaultBotSettings = {
      delay: botDelay,
      avatar: botAvatar,
      bubbleColor: botBubbleColor,
      fontColor: botFontColor,
    };
    const defaultUserSettings = {
      delay: userDelay,
      avatar: userAvatar,
      bubbleColor: userBubbleColor,
      fontColor: userFontColor,
    };
    const defaultCustomSettings = {
      delay: customDelay,
      loadingColor: customLoadingColor,
    };

    for (let i = 0, len = this.props.steps.length; i < len; i += 1) {
      const step = this.props.steps[i];
      let settings = {};

      if (step.user) {
        settings = defaultUserSettings;
      } else if (step.message || step.asMessage || step.options) {
        settings = defaultBotSettings;
      } else if (step.component) {
        settings = defaultCustomSettings;
      }

      steps[step.id] = Object.assign(
        {},
        settings,
        schema.parse(step),
      );
    }

    schema.checkInvalidIds(steps);

    const firstStep = this.props.steps[0];

    if (firstStep.message) {
      const { message } = firstStep;
      firstStep.message = typeof message === 'function' ? message() : message;
      steps[firstStep.id].message = firstStep.message;
    }

    const currentStep = firstStep;
    const renderedSteps = [steps[currentStep.id]];
    const previousSteps = [steps[currentStep.id]];

    this.setState({
      defaultUserSettings,
      steps,
      currentStep,
      renderedSteps,
      previousSteps,
    });
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  onButtonPress() {
    const {
      renderedSteps,
      previousSteps,
      inputValue,
      defaultUserSettings,
    } = this.state;
    let { currentStep } = this.state;

    const isInvalid = currentStep.validator && this.checkInvalidInput();

    if (!isInvalid) {
      const step = {
        message: inputValue,
        value: inputValue,
      };

      currentStep = Object.assign(
        {},
        defaultUserSettings,
        currentStep,
        step,
      );

      renderedSteps.push(currentStep);
      previousSteps.push(currentStep);

      this.setState({
        currentStep,
        renderedSteps,
        previousSteps,
        editable: false,
        inputValue: '',
      });
    }
  }

  getStepMessage(message) {
    const { previousSteps } = this.state;
    const lastStepIndex = previousSteps.length > 0 ? previousSteps.length - 1 : 0;
    const steps = this.generateRenderedStepsById();
    const previousValue = previousSteps[lastStepIndex].value;
    return (typeof message === 'function') ? message({ previousValue, steps }) : message;
  }

  getTriggeredStep(trigger, value) {
    const steps = this.generateRenderedStepsById();
    return (typeof trigger === 'function') ? trigger({ value, steps }) : trigger;
  }

  setContentRef(c) {
    this.scrollView = c;
  }

  setInputRef(c) {
    this.inputRef = c;
  }

  setScrollViewScrollToEnd() {
    this.scrollView.scrollToEnd();
  }

  handleEnd() {
    const { previousSteps } = this.state;

    const renderedSteps = previousSteps.map((step) => {
      const { id, message, value, metadata } = step;
      return { id, message, value, metadata };
    });

    const steps = [];

    for (let i = 0, len = previousSteps.length; i < len; i += 1) {
      const { id, message, value, metadata } = previousSteps[i];
      steps[id] = { id, message, value, metadata };
    }

    const values = previousSteps.filter(step => step.value).map(step => step.value);

    if (this.props.handleEnd) {
      this.props.handleEnd({ renderedSteps, steps, values });
    }
  }

  triggerNextStep(data) {
    const {
      renderedSteps,
      previousSteps,
      steps,
      defaultUserSettings,
    } = this.state;
    let { currentStep, previousStep } = this.state;
    const isEnd = currentStep.end;

    if (data && data.value) {
      currentStep.value = data.value;
    }
    if (data && data.trigger) {
      currentStep.trigger = this.getTriggeredStep(data.trigger, data.value);
    }

    if (isEnd) {
      this.handleEnd();
    } else if (currentStep.options && data) {
      const option = currentStep.options.filter(o => o.value === data.value)[0];
      const trigger = this.getTriggeredStep(option.trigger, currentStep.value);
      delete currentStep.options;

      currentStep = Object.assign(
        {},
        currentStep,
        option,
        defaultUserSettings,
        {
          user: true,
          message: option.label,
          trigger,
        },
      );

      renderedSteps.pop();
      previousSteps.pop();
      renderedSteps.push(currentStep);
      previousSteps.push(currentStep);

      this.setState({
        currentStep,
        renderedSteps,
        previousSteps,
      });
    } else if (currentStep.trigger) {
      const isReplace = currentStep.replace && !currentStep.option;

      if (isReplace) {
        renderedSteps.pop();
      }

      const trigger = this.getTriggeredStep(currentStep.trigger, currentStep.value);
      let nextStep = Object.assign({}, steps[trigger]);

      if (nextStep.message) {
        nextStep.message = this.getStepMessage(nextStep.message);
      } else if (nextStep.update) {
        const updateStep = nextStep;
        nextStep = Object.assign({}, steps[updateStep.update]);

        if (nextStep.options) {
          for (let i = 0, len = nextStep.options.length; i < len; i += 1) {
            nextStep.options[i].trigger = updateStep.trigger;
          }
        } else {
          nextStep.trigger = updateStep.trigger;
        }
      }

      nextStep.key = Random(24);

      previousStep = currentStep;
      currentStep = nextStep;

      if (nextStep.user) {
        this.setState({ editable: true });
        this.inputRef.focus();
      } else {
        renderedSteps.push(nextStep);
        previousSteps.push(nextStep);
      }

      this.setState({
        renderedSteps,
        previousSteps,
        currentStep,
        previousStep,
      });

      Keyboard.dismiss();
    }
  }

  generateRenderedStepsById() {
    const { previousSteps } = this.state;
    const steps = {};

    for (let i = 0, len = previousSteps.length; i < len; i += 1) {
      const { id, message, value, metadata } = previousSteps[i];
      steps[id] = { id, message, value, metadata };
    }

    return steps;
  }

  isLastPosition(step) {
    const { renderedSteps } = this.state;
    const { length } = renderedSteps;
    const stepIndex = renderedSteps.map(s => s.key).indexOf(step.key);

    if (length <= 1 || (stepIndex + 1) === length) {
      return true;
    }

    const nextStep = renderedSteps[stepIndex + 1];
    const hasMessage = nextStep.message || nextStep.asMessage;

    if (!hasMessage) {
      return true;
    }

    const isLast = step.user !== nextStep.user;
    return isLast;
  }

  isFirstPosition(step) {
    const { renderedSteps } = this.state;
    const stepIndex = renderedSteps.map(s => s.key).indexOf(step.key);

    if (stepIndex === 0) {
      return true;
    }

    const lastStep = renderedSteps[stepIndex - 1];
    const hasMessage = lastStep.message || lastStep.asMessage;

    if (!hasMessage) {
      return true;
    }

    const isFirst = step.user !== lastStep.user;
    return isFirst;
  }

  handleKeyPress(event) {
    if (event.nativeEvent.key === 'Enter') {
      this.onButtonPress();
    }
  }

  checkInvalidInput() {
    const { currentStep, inputValue } = this.state;
    const result = currentStep.validator(inputValue);
    const value = inputValue;

    if (typeof result !== 'boolean' || !result) {
      this.setState({
        inputValue: result.toString(),
        inputInvalid: true,
        editable: false,
      });

      setTimeout(() => {
        this.setState({
          inputValue: value,
          inputInvalid: false,
          editable: true,
        });
        this.inputRef.focus();
      }, 2000);

      return true;
    }

    return false;
  }

  renderStep(step, index) {
    const { renderedSteps, previousSteps } = this.state;
    const {
      avatarStyle,
      avatarWrapperStyle,
      bubbleStyle,
      customStyle,
      customDelay,
      hideBotAvatar,
      hideUserAvatar,
    } = this.props;
    const { options, component, asMessage } = step;
    const steps = {};
    const stepIndex = renderedSteps.map(s => s.id).indexOf(step.id);
    const previousStep = stepIndex > 0 ? renderedSteps[index - 1] : {};

    for (let i = 0, len = previousSteps.length; i < len; i += 1) {
      const ps = previousSteps[i];

      steps[ps.id] = {
        id: ps.id,
        message: ps.message,
        value: ps.value,
      };
    }

    if (component && !asMessage) {
      return (
        <CustomStep
          key={index}
          delay={customDelay}
          step={step}
          steps={steps}
          style={customStyle}
          previousStep={previousStep}
          triggerNextStep={this.triggerNextStep}
        />
      );
    }

    if (options) {
      return (
        <OptionsStep
          key={index}
          step={step}
          triggerNextStep={this.triggerNextStep}
          bubbleStyle={bubbleStyle}
        />
      );
    }

    return (
      <TextStep
        key={index}
        step={step}
        steps={steps}
        previousValue={previousStep.value}
        triggerNextStep={this.triggerNextStep}
        avatarStyle={avatarStyle}
        avatarWrapperStyle={avatarWrapperStyle}
        bubbleStyle={bubbleStyle}
        hideBotAvatar={hideBotAvatar}
        hideUserAvatar={hideUserAvatar}
        isFirst={this.isFirstPosition(step)}
        isLast={this.isLastPosition(step)}
      />
    );
  }

  render() {
    const {
      currentStep,
      editable,
      inputInvalid,
      inputValue,
      renderedSteps,
    } = this.state;
    const {
      botBubbleColor,
      botFontColor,
      className,
      contentStyle,
      footerStyle,
      headerComponent,
      inputAttributes,
      inputStyle,
      keyboardVerticalOffset,
      placeholder,
      style,
      submitButtonStyle,
      scrollViewProps,
    } = this.props;

    const styles = {
      input: {
        borderWidth: 0,
        color: inputInvalid ? '#E53935' : '#4a4a4a',
        fontSize: 14,
        opacity: !editable && !inputInvalid ? 0.5 : 1,
        paddingRight: 16,
        paddingLeft: 16,
        height: 50,
        width: width - 80,
      },
      content: {
        height: height - 50,
        backgroundColor: '#eee',
      },
    };

    const textInputStyle = Object.assign({}, styles.input, inputStyle);
    const scrollViewStyle = Object.assign({}, styles.content, contentStyle);
    const platformBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
    const inputAttributesOverride = currentStep.inputAttributes || inputAttributes;

    return (
      <ChatBotContainer
        className={`rsc ${className}`}
        style={style}
      >


        <ImageBackground source={require('../../../Gale_Design_Assets/Onboarding_Screens/onboarding-bg.png')} style={{width:width, height:height, position:'absolute', flex:1}}>
          <ScrollView
          className=""
          style={{flex:8, flexGrow:8}}
          ref={this.setContentRef}
          onContentSizeChange={this.setScrollViewScrollToEnd}
          {...scrollViewProps}>
          {_.map(renderedSteps, this.renderStep)}
          </ScrollView>
          <InputView
            behavior={platformBehavior}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={{flex:1, backgroundColor:'rgba(255,255,255,0.5)', borderWidth:0}}
          >
            <Footer
              className="rsc-footer"
              style={footerStyle}
              disabled={!editable}
              invalid={inputInvalid}
              color={botBubbleColor}
            >
              <View style={{width:'78%', marginRight:6}}>
                <ExpandingTextInput
                  type="textarea"
                  style={[textInputStyle, {height: Math.max(50, this.state.inputHeight), borderWidth:1,}]}
                  className="rsc-input"
                  placeholder={placeholder}
                  ref={this.setInputRef}
                  onKeyPress={this.handleKeyPress}
                  onChangeText={text => this.setState({ inputValue: text })}
                  onContentSizeChange={(event) => {
                    this.setState({ inputHeight: event.nativeEvent.contentSize.height })
                  }}
                  value={inputValue}
                  underlineColorAndroid="transparent"
                  multiline={true}
                  maxLength={238}
                  invalid={inputInvalid}
                  editable={editable}
                  {...inputAttributesOverride}
                />
                {this.state.inputValue.length > 30 ?
                  <Text style={{fontSize:8, left:'90%'}}>
                    {this.state.inputValue.length}/{this.state.inputValue.length > 230 ? (<Text style={{color: 'red', fontSize:8}}>238</Text>) : (238)}
                  </Text>: null  
                }
              </View>
              <View style={{justifyContent:'space-between', height: '100%'}}>
                <Button
                  className="rsc-button"
                  style={[submitButtonStyle,]}
                  disabled={!editable}
                  onPress={this.onButtonPress}
                  invalid={inputInvalid}
                  backgroundColor={botBubbleColor}
                >
                  <ButtonText
                    className="rsc-button-text"
                    invalid={inputInvalid}
                    fontColor='#fff'
                  >
                    SEND
                  </ButtonText>
                </Button>
              </View>
            </Footer>
          </InputView>
          </ImageBackground>


      </ChatBotContainer>
    );
  }
}

ChatBot.propTypes = {
  avatarStyle: PropTypes.object,
  avatarWrapperStyle: PropTypes.object,
  botAvatar: PropTypes.string,
  botBubbleColor: PropTypes.string,
  botDelay: PropTypes.number,
  botFontColor: PropTypes.string,
  bubbleStyle: PropTypes.object,
  contentStyle: PropTypes.object,
  customStyle: PropTypes.object,
  customDelay: PropTypes.number,
  customLoadingColor: PropTypes.string,
  className: PropTypes.string,
  handleEnd: PropTypes.func,
  headerComponent: PropTypes.element,
  hideBotAvatar: PropTypes.bool,
  hideUserAvatar: PropTypes.bool,
  footerStyle: PropTypes.object,
  inputAttributes: PropTypes.objectOf(PropTypes.any),
  inputStyle: PropTypes.object,
  keyboardVerticalOffset: PropTypes.number,
  placeholder: PropTypes.string,
  steps: PropTypes.array.isRequired,
  style: PropTypes.object,
  submitButtonStyle: PropTypes.object,
  userAvatar: PropTypes.string,
  userBubbleColor: PropTypes.string,
  userDelay: PropTypes.number,
  userFontColor: PropTypes.string,
  scrollViewProps: PropTypes.object,
};

ChatBot.defaultProps = {
  avatarStyle: {},
  avatarWrapperStyle: {borderRadius:25, marginTop:10},
  botBubbleColor: '#6E48AA',
  botDelay: 1000,
  botFontColor: '#4a4a4a',
  bubbleStyle: {backgroundColor:'#fff', borderRadius:'25, 25, 25, 25', borderWidth:1, borderColor: '#4F5864', marginBottom:0, marginTop:0},
  contentStyle: {paddingTop:'20%'},
  customStyle: {},
  customDelay: 1000,
  customLoadingColor: '#4a4a4a',
  className: '',
  footerStyle: {},
  handleEnd: undefined,
  hideBotAvatar: false,
  hideUserAvatar: false,
  inputAttributes: {},
  inputStyle: {backgroundColor:'#fff', width: '100%', borderRadius:12, marginLeft:4, borderColor:'black', borderWidth:1, marginTop:5},
  keyboardVerticalOffset: Platform.OS === 'ios' ? 105 : 0,
  placeholder: 'Please type here...',
  headerComponent: undefined,
  style: {},
  submitButtonStyle: { borderRadius:12,width: 73, marginRight:3, color:'#fff', backgroundColor: '#354054', marginTop:5, top: 0},
  userBubbleColor: '#fff',
  userDelay: 1000,
  userFontColor: '#4a4a4a',
  botAvatar: 'https://gale-app-assets.s3.amazonaws.com/gale-chat-icon.png',
  userAvatar: 'https://gale-app-assets.s3.amazonaws.com/avatar-icon.png',
  scrollViewProps: {},
};

export default ChatBot;
