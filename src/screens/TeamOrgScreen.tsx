import React from 'react';
import EditableSectionScreen from '../components/EditableSectionScreen';
import {
  PARTICIPANT_LIST_ASPECT,
  PARTICIPANT_LIST_PAGES,
} from '../data/participantListPages';

export default function TeamOrgScreen() {
  return (
    <EditableSectionScreen
      headerTitle="팀원명단 및 조직도 👥"
      sectionKey="teamOrg"
      tabBackgroundColor="#F0FDF4"
      tabActiveColor="#059669"
      appendixTitle="참가자 명단 (현지 청소년)"
      appendixImages={PARTICIPANT_LIST_PAGES}
      appendixAspectRatio={PARTICIPANT_LIST_ASPECT}
    />
  );
}
