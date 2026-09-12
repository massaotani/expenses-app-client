import { withProjectBuildGradle } from "@expo/config-plugins";

export default function withKotlinJvmTarget(config: any) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents += `

allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "17"
        }
    }
}
`;
    }
    return config;
  });
}
