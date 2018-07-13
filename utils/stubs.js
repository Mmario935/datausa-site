module.exports = {
  generator: {
    name: "New Generator",
    api: "http://api-goes-here",
    description: "New Description",
    logic: "return {}"
  },
  materializer: {
    name: "New Materializer",
    description: "New Description",
    logic: "return {}"
  },
  stat_profile: {
    title: "New Stat",
    subtitle: "New Subtitle",
    value: "New Value"
  },
  profile_description: {
    description: "New Description"
  },  
  visualization_profile: {
    logic: "return {}"
  },
  section_desciption: {
    description: "New Description"
  },
  section_subtitle: {
    subtitle: "New Subtitle"
  },
  stat_topic: {
    title: "New Stat",
    subtitle: "New Subtitle",
    value: "New Value"
  },
  visualization_topic: {
    logic: "return {}"
  },
  topic_description: {
    description: "New Description"
  },
  topic_subtitle: {
    subtitle: "New Subtitle"
  },
  selector: {
    options: [],
    default: "",
    name: "new-selector"
  },
  objTopic: {
    hasCaret: false,
    label: "new-topic-slug",
    itemType: "topic",
    data: {
      title: "New Topic Title",
      subtitle: "New Topic Subtitle",
      slug: "new-topic-slug",
      description: "New Topic Description",
      type: "TextViz"
    }
  },
  objSection: {
    hasCaret: true,
    label: "new-section-slug",
    itemType: "section",
    data: {
      title: "New Section Title",
      slug: "new-section-slug",
      description: "New Section Description"
    }
  },
  objProfile: {
    hasCaret: true,
    label: "new-profile-slug",
    itemType: "profile",
    data: {
      title: "New Profile Title",
      subtitle: "New Profile Subtitle",
      slug: "new-profile-slug",
      description: "New Profile Description",
      label: "New Profile Label"
    }
  }
};
