import net.ltgt.gradle.errorprone.errorprone

plugins {
    java
    jacoco
    checkstyle
    id("com.github.spotbugs") version "6.1.7"
    id("org.owasp.dependencycheck") version "12.2.2"
    id("net.ltgt.errorprone") version "4.1.0"
    id("org.cyclonedx.bom") version "2.2.0"
    id("org.springframework.boot") version "3.5.16"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.company.rag"
version = "0.1.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

extra["commons-lang3.version"] = "3.20.0"
extra["httpclient5.version"] = "5.6.2"
extra["httpcore5.version"] = "5.4.3"
extra["jackson-bom.version"] = "2.21.5"
extra["log4j2.version"] = "2.25.5"
extra["postgresql.version"] = "42.7.12"
extra["tomcat.version"] = "10.1.57"

dependencyManagement {
    imports {
        mavenBom("org.testcontainers:testcontainers-bom:1.20.6")
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")
    implementation("com.pgvector:pgvector:0.1.6")

    errorprone("com.google.errorprone:error_prone_core:2.36.0")

    add("checkstyle", "com.puppycrawl.tools:checkstyle:10.21.4")
    add("checkstyle", "commons-beanutils:commons-beanutils:1.11.0")
    add("checkstyle", "org.codehaus.plexus:plexus-utils:3.6.1")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("com.tngtech.archunit:archunit-junit5:1.4.0")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
}

checkstyle {
    toolVersion = "10.21.4"
    configDirectory.set(layout.projectDirectory.dir("config/checkstyle"))
}

tasks.withType<Checkstyle>().configureEach {
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}

spotbugs {
    effort.set(com.github.spotbugs.snom.Effort.DEFAULT)
    reportLevel.set(com.github.spotbugs.snom.Confidence.MEDIUM)
    excludeFilter.set(layout.projectDirectory.file("config/spotbugs/exclude.xml"))
}

tasks.withType<com.github.spotbugs.snom.SpotBugsTask>().configureEach {
    reports.create("html") {
        required.set(true)
    }
}

dependencyCheck {
    format = "ALL"
    outputDirectory = layout.buildDirectory.dir("reports/dependency-check").get().asFile
    nvd.apiKey = System.getenv("NVD_API_KEY") ?: ""
    failBuildOnCVSS = 7.0f
    failBuildOnUnusedSuppressionRule = true
    suppressionFile = "config/dependency-check-suppressions.xml"
    analyzers.assemblyEnabled = false
    analyzers.nodeEnabled = false
    analyzers.nodeAuditEnabled = false
    analyzers.retirejs.enabled = false
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.errorprone.disableWarningsInGeneratedCode.set(true)
}

tasks.withType<Test> {
    useJUnitPlatform()
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
    classDirectories.setFrom(
        files(
            classDirectories.files.map { tree ->
                fileTree(tree) {
                    exclude("**/RagPlatformApplication.class")
                }
            },
        ),
    )
}

tasks.jacocoTestCoverageVerification {
    dependsOn(tasks.jacocoTestReport)
    classDirectories.setFrom(tasks.jacocoTestReport.get().classDirectories)
    violationRules {
        rule {
            limit {
                minimum = "0.70".toBigDecimal()
            }
        }
        rule {
            element = "PACKAGE"
            includes = listOf(
                "com.company.rag.policy.*",
                "com.company.rag.audit.*",
                "com.company.rag.search.*",
            )
            limit {
                counter = "LINE"
                minimum = "0.90".toBigDecimal()
            }
        }
    }
}

tasks.check {
    dependsOn(tasks.jacocoTestCoverageVerification)
}

tasks.cyclonedxBom {
    includeConfigs.set(listOf("runtimeClasspath"))
    outputFormat.set("json")
    outputName.set("sbom")
}

tasks.bootJar {
    archiveFileName.set("rag-platform.jar")
}

tasks.build {
    dependsOn(tasks.named("cyclonedxBom"))
}
