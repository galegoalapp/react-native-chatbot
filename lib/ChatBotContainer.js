import styled from 'styled-components/native';
import {Dimensions} from "react-native";
const {height} = Dimensions.get("window");
const ChatBotContainer = styled.View`
  background-color: #f5f8fb;
  overflow: scroll;
  height: 90%;
  width: 100%;
`;

export default ChatBotContainer;
