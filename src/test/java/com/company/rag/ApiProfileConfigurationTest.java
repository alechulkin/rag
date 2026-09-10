package com.company.rag;

import static org.assertj.core.api.Assertions.assertThat;

import com.company.rag.config.ApiProfileConfiguration;
import com.company.rag.config.WorkerProfileConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@ActiveProfiles("api")
@TestPropertySource(
        properties = {
            "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration,"
                + "org.springframework.boot.actuate.autoconfigure.security.servlet"
                + ".ManagementWebSecurityAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.security.oauth2.resource.servlet"
                + ".OAuth2ResourceServerAutoConfiguration"
        })
class ApiProfileConfigurationTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void apiProfileLoadsApiConfigurationOnly() {
        assertThat(context.getBeansOfType(ApiProfileConfiguration.class)).hasSize(1);
        assertThat(context.getBeansOfType(WorkerProfileConfiguration.class)).isEmpty();
    }
}
