// @flow
// import * as React from "react";
import React, { Component } from "react";

import {
  StyleSheet,
  View,
  ImageBackground,
  Dimensions,
  Platform,
  TouchableOpacity,
  Image
} from "react-native";
import { H1, H3 } from "native-base";
import { Audio } from "expo-av";
import ChatBot from "react-native-chatbot";
import PropTypes from "prop-types";

import variables from "../../../native-base-theme/variables/commonColor";
import s from "../../../native-base-theme/shared/style";
import type { ScreenProps } from "../components/Types";
import OnboardingBg from "../../../Gale_Design_Assets/Onboarding_Screens/onboarding-bg.png";
import PauseIcon from "../../../Gale_Design_Assets/Chatbot/pause-icon-corner.png";
import PlayIcon from "../../../Gale_Design_Assets/Chatbot/chatbot-play-icon.png";

const { height, width } = Dimensions.get("window");
const platform = Platform.OS;

class Review extends Component {
  constructor(props) {
    super(props);
  }

  componentWillMount() {
    const { steps } = this.props;
    const { name, behavior } = steps;

    this.setState({ name, behavior });
  }

  render() {
    const { name, behavior } = this.state;
    return (
      <View style={{ width: "60%" }}>
        <H1 style={{ textAlign: "center" }}>Summary</H1>
        <H3>{name.value}</H3>
        <H3>{behavior.value}</H3>
      </View>
    );
  }
}

Review.propTypes = {
  steps: PropTypes.object
};

Review.defaultProps = {
  steps: undefined
};

class SimpleForm extends Component {
  constructor(props) {
    super(props);
    this.playbackInstance = null;
    this.state = {
      minInput: 2,
      maxInput: 150,
      isPlaying: false
    };
  }

  componentWillMount() {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false
    });
    this._loadNewPlaybackInstance(true);
  }
  componentWillUnmount() {
    this.playbackInstance.unloadAsync();
    //  Check Your Console To verify that the above line is working
    console.log("unmount");
  }
  async _loadNewPlaybackInstance(playing) {
    if (this.playbackInstance != null) {
      await this.playbackInstance.unloadAsync();
      this.playbackInstance.setOnPlaybackStatusUpdate(null);
      this.playbackInstance = null;
    }
    const source = {
      uri:
        "https://s3.amazonaws.com/exp-us-standard/audio/playlist-example/Comfort_Fit_-_03_-_Sorry.mp3"
    };
    const initialStatus = {
      //        Play by default
      shouldPlay: false,
      //        Control the speed
      rate: 1.0,
      //        Correct the pitch
      shouldCorrectPitch: true,
      //        Control the Volume
      volume: 1.0,
      //        mute the Audio
      isMuted: false
    };
    const { sound, status } = await Audio.Sound.createAsync(
      source,
      initialStatus
    );
    //  Save the response of sound in playbackInstance
    this.playbackInstance = sound;
    //  Make the loop of Audio
    this.playbackInstance.setIsLoopingAsync(true);
  }
  _playOrPause = () => {
    if (this.state.isPlaying) {
      this.playbackInstance.pauseAsync();
    } else {
      this.playbackInstance.playAsync();
    }
    this.setState({ isPlaying: !this.state.isPlaying });
  };
  move = ({ steps, values }) => {
    this.handleEnd({ steps, values });
    this.props.navigation.navigate("Explain");
  };
  handleEnd({ values }) {
    const userData = {
      name: values[0],
      gender: values[1],
      age: values[2]
    };
    // console.log(userData);
  }
  render() {
    return (
      <View>
        <ImageBackground source={OnboardingBg} style={{ width, height }}>
          <View style={s.heading}>
            <H3 style={{ textAlign: "center" }}>Tracking a Behavior</H3>
            {this.state.isPlaying ? (
              <TouchableOpacity onPress={this._playOrPause} style={s.pauseIcon}>
                <Image
                  source={PauseIcon}
                  resizeMode="center"
                  style={{ height: 30, width: 30 }}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={this._playOrPause} style={s.playIcon}>
                <Image source={PlayIcon} resizeMode="center" />
              </TouchableOpacity>
            )}
          </View>

          <ChatBot
            handleEnd={this.move}
            steps={[
              {
                id: "1",
                message: "What is your name?",
                trigger: "name"
              },
              {
                id: "name",
                user: true,
                trigger: "3"
              },
              {
                id: "3",
                message:
                  "Hi {previousValue}! We are excited to help you add a new goal!",
                trigger: "4"
              },
              {
                id: "4",
                message:
                  "Having a specific behavior to focus on makes it easier to identify and measure progress.",
                trigger: "5"
              },
              {
                id: "5",
                message:
                  'As referenced, one of the simplest ways to identify a specific behavior is to make sure the first word is an "-ing word," like eating 3 servings of vegetables a day, walking on a treadmill, or going to sleep at 11 PM. ',
                trigger: "6"
              },
              {
                id: "6",
                message: "Please identify a behavior for us.",
                trigger: "behavior"
              },
              {
                id: "behavior",
                user: true,
                trigger: "7",
                validator: value => {
                  if (isNaN(value)) {
                    return true;
                  }
                }
              },
              {
                id: "7",
                message: "Great! Check out your summary",
                trigger: "end-message"
              },
              {
                id: "end-message",
                message: "Thanks! Your data was submitted successfully!",
                trigger: (val, step) => {
                  console.log("this happened");
                },
                end: true
              }
            ]}
            // style={(this.state.inputValue.length >this.state.minInput && this.state.inputValue.length < this.state.maxInput ) ? style.activeButton: style.inactiveButton}
          />
        </ImageBackground>
      </View>
    );
  }
}

export default SimpleForm;

const style = StyleSheet.create({
  activeButton: {
    backgroundColor: "blue"
  },
  inactiveButton: {
    backgroundColor: "gray"
  },
  tabHeading: {
    color: variables.gray
  },
  tab: {
    backgroundColor: "#f8f8f8",
    padding: variables.contentPadding * 4
  },
  botColor: {
    color: "blue"
  }
});
