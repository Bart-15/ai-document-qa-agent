jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");
jest.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { S3Service } from "../s3.service";

describe("S3Service", () => {
  let service: S3Service;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn();
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
    service = new S3Service();
  });

  describe("getPresignedUrl", () => {
    it("should return a presigned URL with correct parameters", async () => {
      const mockUrl = "https://presigned-url.example.com";
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(mockUrl);

      const result = await service.getPresignedUrl(
        "test-bucket",
        "test-file.pdf",
        "application/pdf",
      );

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "test-file.pdf",
        ContentType: "application/pdf",
      });
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({ send: mockSend }),
        expect.any(PutObjectCommand),
        { expiresIn: 3600 },
      );
      expect(result).toBe(mockUrl);
    });
  });

  describe("generateFileName", () => {
    it("should generate a sanitized filename with UUID", () => {
      const result = service.generateFileName("My File Name!@#.pdf", "pdf");
      expect(result).toBe("mock-uuid-my-file-name.pdf");
    });

    it("should handle multiple special characters and spaces", () => {
      const result = service.generateFileName("My!!!   File###Name", "txt");
      expect(result).toBe("mock-uuid-my-file-name.txt");
    });
  });

  describe("getObject", () => {
    it("should call S3 getObject with correct parameters", async () => {
      const mockResponse = { Body: "test-response" };
      mockSend.mockResolvedValueOnce(mockResponse);
      process.env.BUCKET_NAME = "test-bucket";

      const result = await service.getObject("test-key");

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "test-key",
      });
      expect(mockSend).toHaveBeenCalled();
      expect(result).toBe(mockResponse);
    });
  });
});
