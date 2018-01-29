module.exports = function(sequelize, db) {

  const t = sequelize.define("topics",
    {
      id: {
        type: db.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: db.STRING,
      subtitle: db.STRING,
      slug: db.STRING,
      description: db.TEXT,
      section_id: db.INTEGER, 
      type: db.STRING,
      ordering: db.INTEGER
    }, 
    {
      freezeTableName: true,
      timestamps: false
    }
  );

  t.associate = models => {
    t.hasMany(models.visualizations_topics, {foreignKey: "topic_id", sourceKey: "id", as: "visualizations"});
    t.hasMany(models.stats_topics, {foreignKey: "topic_id", sourceKey: "id", as: "stats"});
  };

  return t;

};
