const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withKotlinJvmTarget(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents += `

allprojects {
  afterEvaluate { project ->
    if (project.hasProperty("android")) {
      project.android {
        compileOptions {
          sourceCompatibility JavaVersion.VERSION_17
          targetCompatibility JavaVersion.VERSION_17
        }
      }
    }
    project.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
      kotlinOptions {
        jvmTarget = "17"
      }
    }
  }
}
`;
    }
    return config;
  });
};
