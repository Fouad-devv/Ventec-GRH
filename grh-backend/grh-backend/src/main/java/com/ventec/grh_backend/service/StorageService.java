package com.ventec.grh_backend.service;

import com.ventec.grh_backend.exception.NotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.UUID;

@Service
@Slf4j
public class StorageService {

    @Value("${storage.path}")
    private String storagePath;

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.service-key:}")
    private String supabaseKey;

    @Value("${supabase.bucket:grh-files}")
    private String supabaseBucket;

    private final RestTemplate restTemplate = new RestTemplate();

    private boolean useSupabase() {
        return supabaseUrl != null && !supabaseUrl.isBlank()
                && supabaseKey != null && !supabaseKey.isBlank();
    }

    public String store(MultipartFile file, String subdir) {
        try {
            String original = StringUtils.cleanPath(
                    file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
            String filename = UUID.randomUUID() + "_" + original;
            String objectPath = subdir + "/" + filename;

            if (useSupabase()) {
                String ct = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
                uploadToSupabase(objectPath, file.getBytes(), ct);
            } else {
                Path dir = Paths.get(storagePath, subdir);
                Files.createDirectories(dir);
                Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            }
            return objectPath;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + e.getMessage(), e);
        }
    }

    public Resource loadAsResource(String relativePath) {
        if (useSupabase()) {
            byte[] bytes = downloadFromSupabase(relativePath);
            return new ByteArrayResource(bytes);
        }
        try {
            Path file = Paths.get(storagePath).resolve(relativePath);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new NotFoundException("File not found: " + relativePath);
        } catch (MalformedURLException e) {
            throw new NotFoundException("File not found: " + relativePath);
        }
    }

    public String storeBytes(byte[] data, String filename, String subdir) {
        String uniqueFilename = UUID.randomUUID() + "_" + filename;
        String objectPath = subdir + "/" + uniqueFilename;

        if (useSupabase()) {
            uploadToSupabase(objectPath, data, "application/octet-stream");
        } else {
            try {
                Path dir = Paths.get(storagePath, subdir);
                Files.createDirectories(dir);
                Files.write(dir.resolve(uniqueFilename), data);
            } catch (IOException e) {
                throw new RuntimeException("Failed to store bytes: " + e.getMessage(), e);
            }
        }
        return objectPath;
    }

    public void delete(String relativePath) {
        if (relativePath == null) return;
        if (useSupabase()) {
            deleteFromSupabase(relativePath);
            return;
        }
        try {
            Files.deleteIfExists(Paths.get(storagePath).resolve(relativePath));
        } catch (IOException e) {
            log.warn("Could not delete file: {}", relativePath);
        }
    }

    private void uploadToSupabase(String objectPath, byte[] data, String contentType) {
        String url = supabaseUrl + "/storage/v1/object/" + supabaseBucket + "/" + objectPath;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseKey);
        headers.set("x-upsert", "true");
        headers.setContentType(MediaType.parseMediaType(contentType));
        restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(data, headers), String.class);
    }

    private byte[] downloadFromSupabase(String objectPath) {
        String url = supabaseUrl + "/storage/v1/object/" + supabaseBucket + "/" + objectPath;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseKey);
        ResponseEntity<byte[]> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), byte[].class);
        if (response.getBody() == null) {
            throw new NotFoundException("File not found in storage: " + objectPath);
        }
        return response.getBody();
    }

    private void deleteFromSupabase(String objectPath) {
        try {
            String url = supabaseUrl + "/storage/v1/object/" + supabaseBucket + "/" + objectPath;
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseKey);
            restTemplate.exchange(url, HttpMethod.DELETE, new HttpEntity<>(headers), String.class);
        } catch (Exception e) {
            log.warn("Could not delete file from Supabase: {}", objectPath);
        }
    }
}
