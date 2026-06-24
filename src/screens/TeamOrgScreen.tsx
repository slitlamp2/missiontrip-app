import React from 'react';
import EditableSectionScreen from '../components/EditableSectionScreen';

export default function TeamOrgScreen() {
  return (
    <EditableSectionScreen
      headerTitle="팀원명단 및 조직도 👥"
      sectionKey="teamOrg"
      tabBackgroundColor="#F0FDF4"
      tabActiveColor="#059669"
    />
  );
}
