import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf="house.fill" />
        <Label>ホーム</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="drinks">
        <Icon sf="note.text" />
        <Label>記録</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="events">
        <Icon sf="party.popper.fill" />
        <Label>イベント</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf="person.fill" />
        <Label>プロフィール</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
