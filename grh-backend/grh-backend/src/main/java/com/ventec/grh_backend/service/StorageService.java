package com.ventec.grh_backend.service;

import com.ventec.grh_backend.exception.NotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
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

    public String store(MultipartFile file, String subdir) {
        try {
            Path dir = Paths.get(storagePath, subdir);
            Files.createDirectories(dir);
            String original = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
            String filename = UUID.randomUUID() + "_" + original;
            Path target = dir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return subdir + "/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + e.getMessage(), e);
        }
    }

    public Resource loadAsResource(String relativePath) {
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
        try {
            Path dir = Paths.get(storagePath, subdir);
            Files.createDirectories(dir);
            String uniqueFilename = UUID.randomUUID() + "_" + filename;
            Path target = dir.resolve(uniqueFilename);
            Files.write(target, data);
            return subdir + "/" + uniqueFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store bytes: " + e.getMessage(), e);
        }
    }

    public void delete(String relativePath) {
        if (relativePath == null) return;
        try {
            Path file = Paths.get(storagePath).resolve(relativePath);
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("Could not delete file: {}", relativePath);
        }
    }
}
