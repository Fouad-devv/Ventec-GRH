# ── Stage 1: Build ──────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# copy pom first for layer caching
COPY pom.xml ./
RUN mvn dependency:go-offline -B -q

# copy source and build fat jar
COPY src ./src
RUN mvn package -DskipTests -B -q

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S grh && adduser -S grh -G grh && \
    mkdir -p /data/uploads && \
    chown -R grh:grh /data
USER grh

COPY --from=build /app/target/*.jar app.jar

EXPOSE 5000
ENTRYPOINT ["java", "-jar", "app.jar"]
